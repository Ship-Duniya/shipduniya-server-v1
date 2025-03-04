const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { generateTicketId } = require("../utils/helpers");
const axios = require("axios");
const sendEmail = require("../utils/sendEmail");
const { Storage } = require("@google-cloud/storage");
const multer = require("multer");
const path = require("path");

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.GCP_KEY_FILE_PATH,
});
const bucketName = process.env.GCP_BUCKET_NAME;

// Multer Storage Configuration (Temp File Storage)
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory before upload
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit: 5MB per file
});

const raiseTicket = async (req, res) => {
  const userId = req.user.id;
  const { issueType, awbNumber, subject, description } = req.body;
  let fileUrl = null;

  try {
    // Generate a unique ticket ID
    const ticketId = await generateTicketId();
    console.log(`Generated Ticket ID: ${ticketId}`);

    if (issueType === "shipment" && !awbNumber) {
      return res.status(400).json({
        error: "AWB number is required for shipment-related tickets.",
      });
    }

    // Check if a file was uploaded
    if (req.file) {
      const fileName = `tickets/${ticketId}-${Date.now()}${path.extname(req.file.originalname)}`;
      const file = storage.bucket(bucketName).file(fileName);

      // Upload file to GCP bucket
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });

      // Generate Signed URL (valid for 7 days)
      [fileUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      console.log(`File uploaded: ${fileUrl}`);
    }

    // Save ticket with file URL (if available)
    const newTicket = new Ticket({
      userId,
      issueType,
      subject,
      awbNumber,
      description,
      ticketId,
      fileUrl, // Save the file URL in the ticket record
    });

    await newTicket.save();

    console.log(`Ticket raised successfully: Ticket ID ${ticketId}`);

    return res.status(201).json({
      message: "Ticket raised successfully.",
      ticket: newTicket,
    });
  } catch (error) {
    console.error("Error in raiseTicket:", error.message);
    return res.status(500).json({
      error: "Failed to raise ticket.",
      details: error.message,
    });
  }
};

// Middleware to handle file uploads before calling raiseTicket
const uploadMiddleware = upload.single("attachment");

//view tickets by user
const viewTickets = async (req, res) => {
  const userId = req.user.id;

  try {
    const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error in viewTickets:", error.message);
    return res.status(500).json({
      error: "Failed to fetch tickets.",
      details: error.message,
    });
  }
};

//chat on ticket by user and support
const chatOnTicket = async (req, res) => {
  const userId = req.user.id;
  const { ticketId } = req.params;
  const { message } = req.body;

  try {
    // Fetch the user from the database to get the role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const { role } = user; // Get the role from the user object

    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    // Role-based access check
    if (role === "user" && ticket.userId.toString() !== userId) {
      // Ensure a user can only access their own tickets
      return res
        .status(403)
        .json({ error: "You are not authorized to access this ticket." });
    }

    // Add the message to the ticket
    const sender = role === "support" ? "support" : "user";
    ticket.messages.push({ sender, message });

    ticket.updatedAt = new Date();
    await ticket.save();

    return res.status(200).json({
      message: "Message added to ticket.",
      ticket,
    });
  } catch (error) {
    console.error("Error in chatOnTicket:", error.message);
    return res.status(500).json({
      error: "Failed to update ticket.",
      details: error.message,
    });
  }
};

// Logic to fetch all tickets (for support role)
const viewAllTickets = async (req, res) => {
  try {
    // Ensure the user has the "support" role
    if (req.user.role !== "support") {
      return res.status(403).json({
        error: "Access denied. You do not have permission to view all tickets.",
      });
    }

    const tickets = await Ticket.find().sort({ createdAt: -1 });
    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error in viewAllTickets:", error.message);
    return res.status(500).json({
      error: "Failed to fetch tickets.",
      details: error.message,
    });
  }
};

const transferTicketToVendor = async (req, res) => {
  const { ticketId } = req.params;
  const { vendor } = req.body;

  try {
    if (!["xpressbees", "delivery", "ecom"].includes(vendor)) {
      return res.status(400).json({
        error:
          "Invalid vendor. Please choose from xpressbees, delivery, or ecom.",
      });
    }

    // Find the ticket by its ID
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    // Update the ticket with the vendor
    ticket.vendor = vendor;
    ticket.status = "in-progress";
    await ticket.save();

    return res.status(200).json({
      message: `Ticket successfully transferred to ${vendor}.`,
      ticket,
    });
  } catch (error) {
    console.error("Error in transferTicketToVendor:", error.message);
    return res.status(500).json({
      error: "Failed to transfer ticket to vendor.",
      details: error.message,
    });
  }
};

const updateTicketStatus = async (req, res) => {
  const userId = req.user;
  const { ticketId } = req.params;
  const { status, progress } = req.body;

  try {
    // Validate status
    const validStatuses = ["open", "in-progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    // Check if the user is authorized to update the ticket
    if (req.user.role !== "support" && ticket.userId.toString() !== userId) {
      return res.status(403).json({
        error: "You are not authorized to update this ticket.",
      });
    }

    // Update status and progress
    ticket.status = status;
    if (progress) {
      ticket.progress = progress;
    }
    ticket.updatedAt = new Date();
    await ticket.save();

    return res.status(200).json({
      message: "Ticket status updated successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Error in updateTicketStatus:", error.message);
    return res.status(500).json({
      error: "Failed to update ticket status.",
      details: error.message,
    });
  }
};

// **********correct one but need to replace the api path*********
// const transferTicketToVendor = async (req, res) => {
//   const { ticketId } = req.params;
//   const { vendor } = req.body;

//   try {
//     // Ensure the vendor is one of the allowed ones
//     if (!["xpressbees", "delivery", "ecom"].includes(vendor)) {
//       return res.status(400).json({
//         error: "Invalid vendor. Please choose from xpressbees, delivery, or ecom.",
//       });
//     }

//     // Find the ticket by its ID
//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) {
//       return res.status(404).json({ error: "Ticket not found." });
//     }

//     // Update the ticket with the vendor
//     ticket.vendor = vendor;
//     ticket.status = "in-progress"; // Optionally, update the status when transferring
//     await ticket.save();

//     // Define vendor API URLs and payloads
//     let vendorApiUrl;
//     let payload;

//     switch (vendor) {
//       case "xpressbees":
//         vendorApiUrl = "https://api.xpressbees.com/transfer"; // Replace with real URL
//         payload = { ticketId, description: ticket.description, awbNumber: ticket.awbNumber };
//         break;
//       case "delivery":
//         vendorApiUrl = "https://api.delivery.com/transfer"; // Replace with real URL
//         payload = { ticketId, description: ticket.description, awbNumber: ticket.awbNumber };
//         break;
//       case "ecom":
//         vendorApiUrl = "https://api.ecom.com/transfer"; // Replace with real URL
//         payload = { ticketId, description: ticket.description, awbNumber: ticket.awbNumber };
//         break;
//       default:
//         return res.status(400).json({ error: "Unknown vendor" });
//     }

//     // Call the vendor's API
//     try {
//       const response = await axios.post(vendorApiUrl, payload);
//       console.log(`Ticket transferred to ${vendor}:`, response.data);
//     } catch (apiError) {
//       console.error(`Error transferring ticket to ${vendor}:`, apiError.message);
//       return res.status(500).json({
//         error: `Failed to transfer ticket to ${vendor}`,
//         details: apiError.message,
//       });
//     }

//     return res.status(200).json({
//       message: `Ticket successfully transferred to ${vendor}.`,
//       ticket,
//     });
//   } catch (error) {
//     console.error("Error in transferTicketToVendor:", error.message);
//     return res.status(500).json({
//       error: "Failed to transfer ticket to vendor.",
//       details: error.message,
//     });
//   }
// };

module.exports = {
  // getAllTicketsOfUser,
  // createTicket,
  // getAllTickets,
  // getSingleTicket,
  updateTicketStatus,
  // deleteTicket,
  raiseTicket,
  viewTickets,
  chatOnTicket,
  viewAllTickets,
  transferTicketToVendor,
  uploadMiddleware
};
