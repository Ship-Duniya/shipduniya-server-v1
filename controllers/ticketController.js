const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { generateTicketId } = require("../utils/helpers");
const axios = require("axios");
const sendEmail = require("../utils/sendEmail");

// Create a ticket
// const createTicket = async (req, res) => {
//   console.log(req.user);
//   try {
//     const ticket = new Ticket({
//       userId: req.user.id,
//       subject: req.body.subject,
//       ticketId: generateTicketId(),
//       message: req.body.message,
//       issueType: req.body.issueType,
//     });

//     await ticket.save();
//     res.status(201).json(ticket);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error });
//   }
// };

// // Get all tickets (Admin/Support)
// const getAllTickets = async (req, res) => {
//   try {
//     const tickets = await Ticket.find()
//       .populate('userId', 'name email')
//       .sort({ updatedAt: -1 });
//     res.json(tickets);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching tickets', error });
//   }
// };

// // Get all tickets of a user
// const getAllTicketsOfUser = async (req, res) => {
//   try {
//     const tickets = await Ticket.find({ userId: req.user.id })
//       .populate('userId', 'name email')
//       .sort({ updatedAt: -1 });
//     res.json(tickets);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching tickets', error });
//   }
// };

// // Get a single ticket (Admin/Support)
// const getSingleTicket = async (req, res) => {
//   try {
//     const ticket = await Ticket.findById(req.params.id).populate(
//       'userId',
//       'name email'
//     );
//     if (!ticket) {
//       return res.status(404).json({ message: 'Ticket not found' });
//     }
//     res.json(ticket);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching ticket', error });
//   }
// };

// // Update ticket status
// const updateTicketStatus = async (req, res) => {
//   const { ticketId } = req.params;
//   const { status } = req.body;

//   if (!["open", "in-progress", "resolved"].includes(status)) {
//     return res.status(400).json({ error: "Invalid status value" });
//   }

//   try {
//     const updateData = { status };
//     if (status === "resolved") {
//       updateData.resolvedAt = Date.now();
//     }

//     const ticket = await Ticket.findByIdAndUpdate(ticketId, updateData, {
//       new: true,
//     });

//     if (!ticket) {
//       return res.status(404).json({ error: "Ticket not found" });
//     }

//     const user = await User.findById(ticket.userId);
//     const emailSubject = `Ticket Status Updated: ${ticket.ticketId}`;
//     const emailMessage = `Hello ${user.name},\n\nYour ticket with ID ${ticket.ticketId} has been updated to "${status}".\n\nThank you for your patience.\n\nBest regards,\nSupport Team`;

//     await sendEmail(user.email, emailSubject, emailMessage);

//     res.status(200).json(ticket);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// // Delete a ticket
// const deleteTicket = async (req, res) => {
//   try {
//     const ticket = await Ticket.findById(req.params.id);
//     if (!ticket) {
//       return res.status(404).json({ message: 'Ticket not found' });
//     }

//     await ticket.remove();
//     res.json({ message: 'Ticket deleted' });
//   } catch (error) {
//     res.status(500).json({ message: 'Error deleting ticket', error });
//   }
// };

//user- raise tickets
const raiseTicket = async (req, res) => {
  const userId = req.user.id;
  const { issueType, awbNumber, subject, description } = req.body;

  try {
    // Generate a unique ticket ID
    const ticketId = await generateTicketId();
    console.log(`Generated Ticket ID: ${ticketId}`);

    if (issueType === "shipment" && !awbNumber) {
      return res.status(400).json({
        error: "AWB number is required for shipment-related tickets.",
      });
    }

    const newTicket = new Ticket({
      userId,
      issueType,
      subject,
      awbNumber,
      description,
      ticketId, // Store the generated ticket ID
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
};
