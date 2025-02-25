const User = require("../models/User");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");
const Transaction = require("../models/Transaction");
const Shipping = require("../models/Shipping");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const mongoose = require("mongoose")
const { generateId } = require("../utils/helpers");
const { EMAIL_USER, EMAIL_PASS } = process.env;

// Helper function to send email
const sendEmail = async (email, password) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: "Your Account Credentials",
    text: `Your account has been created. Here are your credentials:\n\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after logging in.`,
  };

  await transporter.sendMail(mailOptions);
};

// Get admin dashboard data
const getAdminDashboard = async (req, res) => {
  try {
    // Fetch total users
    const totalUsersPromise = User.countDocuments();
    const parcelsPromise = Shipping.countDocuments();
    const ticketsPromise = Ticket.countDocuments();
    const resolvedTicketsPromise = Ticket.countDocuments({
      status: "resolved",
    });

    // Calculate the date 30 days ago from today
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    // Count users created in the last 30 days
    const userIncreasePromise = User.countDocuments({
      createdAt: { $gte: lastMonth },
    });

    // Execute all database queries in parallel for better performance
    const [totalUsers, parcels, tickets, resolvedTickets, userIncrease] =
      await Promise.all([
        totalUsersPromise,
        parcelsPromise,
        ticketsPromise,
        resolvedTicketsPromise,
        userIncreasePromise,
      ]);

    // Compute derived values
    const openTickets = tickets - resolvedTickets;
    const resolvedPercentage =
      tickets > 0 ? (resolvedTickets / tickets) * 100 : 0;

    // Send response
    res.status(200).json({
      totalUsers,
      parcels,
      openTickets,
      resolvedPercentage,
      userIncrease,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching dashboard data", error: error.message });
  }
};

// Get all users
// const getAllUsers = async (req, res) => {
//   try {
//     let query = { isDeleted: false };

//     const users = await User.find({ role: "user" }).select("-password");
//     res.json(users);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching users", error });
//   }
// };

const getAllUsers = async (req, res) => {
  try {
    // Define the query filter, including isDeleted field
    let query = { role: "user", isDeleted: false };

    // Fetch users matching the query, excluding the password field
    const users = await User.find(query).select("-password");

    // If no users found, return a message
    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // Return the list of users
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};


const getAllStaffs = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["admin", "support"] },
    }).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching staff", error });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Find user by ID
    const user = await User.findById(id);

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already deleted
    if (user.isDeleted) {
      return res.status(400).json({ message: "User is already deleted" });
    }

    // Soft delete the user by setting isDeleted to true
    user.isDeleted = true;
    await user.save();

    res.status(200).json({ message: "User marked as deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const updateStaffById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};

// Create a new admin (only superadmins can create admins)
const createStaff = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      name,
      email,
      userId: generateId(role),
      password: hashedPassword,
      role: role,
    });

    res.status(201).json({
      _id: newAdmin._id,
      userId: generateId(role),
      name: newAdmin.name,
      email: newAdmin.email,
      role: role,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error", error });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Staff not found" });
    }
    const deletedStaff = await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Staff deleted Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error deleting staff", error });
  }
};

const getAdminMetrics = async (req, res) => {
  try {
    // Fetch total users with role "user"
    const totalUserPromise = User.countDocuments({ role: "user" });

    // Group Users by creation date (filtered by role: "user")
    const usersByDatePromise = User.aggregate([
      { $match: { role: "user" } }, // Only count users with role "user"
      {
        $group: {
          _id: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Group Orders by creation date and status
    const ordersByDatePromise = Order.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Group Tickets by creation date and status
    const ticketsByDatePromise = Ticket.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Group Transactions by creation date
    const transactionsByDatePromise = Transaction.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Execute all queries in parallel
    const [
      totalUser,
      usersByDate,
      ordersByDate,
      ticketsByDate,
      transactionsByDate,
    ] = await Promise.all([
      totalUserPromise,
      usersByDatePromise,
      ordersByDatePromise,
      ticketsByDatePromise,
      transactionsByDatePromise,
    ]);

    // Transform data into required format
    const metrics = {};

    usersByDate.forEach((user) => {
      const date = user._id;
      metrics[date] = metrics[date] || {};
      metrics[date].NewUsers = user.count; // Updated field name
    });

    ordersByDate.forEach((order) => {
      const { date, status } = order._id;
      metrics[date] = metrics[date] || {};

      if (status === "pending") {
        metrics[date].PendingOrders = order.count;
      } else if (status === "delivered") {
        metrics[date].DeliveredOrders = order.count;
      }
    });

    ticketsByDate.forEach((ticket) => {
      const { date, status } = ticket._id;
      metrics[date] = metrics[date] || {};

      if (status === "resolved") {
        metrics[date].ResolvedTickets = ticket.count;
      } else {
        metrics[date].UnresolvedTickets = ticket.count;
      }
    });

    transactionsByDate.forEach((transaction) => {
      const date = transaction._id;
      metrics[date] = metrics[date] || {};
      metrics[date].TotalTransactions = transaction.count;
    });

    // Merge and ensure all dates have all metrics
    const formattedResponse = Object.keys(metrics).map((date) => ({
      Date: date,
      NewUsers: metrics[date].NewUsers || 0, // Updated field name
      PendingOrders: metrics[date].PendingOrders || 0,
      DeliveredOrders: metrics[date].DeliveredOrders || 0,
      ResolvedTickets: metrics[date].ResolvedTickets || 0,
      UnresolvedTickets: metrics[date].UnresolvedTickets || 0,
      TotalTransactions: metrics[date].TotalTransactions || 0,
    }));

    // Send response with TotalUser field added
    return res.status(200).json({
      TotalUser: totalUser, // Total count of users with role: "user"
      formattedResponse,
    });
  } catch (error) {
    console.error("Error fetching admin metrics:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create User
const createUser = async (req, res) => {
  try {
    const { name, email, phone, role, customerType } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Ensure admin cannot create superadmin
    if (role === "superadmin" && req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to create a superadmin." });
    }

    // Generate a random password
    const password = crypto.randomBytes(8).toString("hex");

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate userId
    const userId = generateId(role);

    // Create a new user
    const newUser = new User({
      userId, // Assign generated userId
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      customerType,
      isDeleted: false, // Ensure new users are not soft deleted
    });

    await newUser.save();

    // Send email with credentials (Uncomment when implementing)
    // await sendEmail(email, password);

    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: newUser._id,
        userId: newUser.userId, // Return generated userId in response
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        customerType: newUser.customerType,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error.message);
    res.status(500).json({ error: "Failed to create user", details: error.message });
  }
};

// Get All Users
const getAllUserss = async (req, res) => {
  try {
    const role = req.user.role;
    let query = { isDeleted: false };

    if (role === "admin") {
      query.role = { $nin: ["admin", "superadmin"] };
    }

    const users = await User.find(query);
    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Get User By ID
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const role = req.user.role;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Admin cannot fetch superadmin
    if (user.role === "superadmin" && role !== "superadmin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to view this user." });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, role, customerType, address, pincode } = req.body;
    const requestingRole = req.user.role;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Role-based restrictions
    if (user.role === "superadmin" && requestingRole !== "superadmin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this user." });
    }
    if (user.role === "admin" && requestingRole === "admin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to update another admin." });
    }

    // Update fields
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.role = role || user.role;
    user.customerType = customerType || user.customerType;
    user.address = address || user.address;
    user.pincode = pincode || user.pincode;

    await user.save();
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
};

// Delete User
const deleteUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const role = req.user.role;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Role-based restrictions
    if (user.role === "superadmin" && role !== "superadmin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this user." });
    }
    if (user.role === "admin" && role === "admin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete another admin." });
    }

    await user.remove();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};

//fetch all shipment by admin and super admin
const getAllShipmentsForAdmin = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to view shipments.",
      });
    }

    // Fetch shipments with user details
    const shipments = await Shipping.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $addFields: {
          userName: "$user.name",
        },
      },
      {
        $project: {
          user: 0, // Remove full user details
        },
      },
    ]);

    if (!shipments.length) {
      return res.status(404).json({ message: "No shipments found" });
    }

    res.status(200).json(shipments);
  } catch (error) {
    console.error("Error in getAllShipmentsForAdmin:", error.message);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getRTCOrderForAdmin = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to view orders.",
      });
    }

    // Fetch only users with userType "wp" who have delivered orders
    const deliveredOrders = await Order.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" }, // Convert array to object
      {
        $match: {
          "user.userType": "wp", // Only fetch "wp" users
          status: "delivered", // Only fetch delivered orders
        },
      },
      {
        $group: {
          _id: "$userId",
          userName: { $first: "$user.name" },
          userEmail: { $first: "$user.email" },
          deliveredOrders: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          userName: 1,
          userEmail: 1,
          deliveredOrders: 1,
        },
      },
    ]);

    if (!deliveredOrders.length) {
      return res.status(404).json({
        message: "No delivered orders found for users with userType 'wp'.",
      });
    }

    res.status(200).json(deliveredOrders);
  } catch (error) {
    console.error("Error fetching delivered orders for admin:", error.message);
    res.status(500).json({
      message: "Failed to fetch delivered orders, please try again later.",
      error: error.message,
    });
  }
};

const fetchCodRemittanceOrders = async (req, res) => {
  try {
    const userId = req.user.id; // Extract userId from the token via `authenticate` middleware
    const userRole = req.user.role; // Extract role (admin, superadmin, or user)

    let query = {
      orderType: "cod",
      status: "delivered",
    };

    // For admin and superadmin, remove the userId filter
    if (userRole === "admin" || userRole === "superadmin") {
      // Admin and Superadmin get all orders matching the criteria
    } else {
      // Normal users can only see their own orders
      query.userId = userId;
    }

    // Query: Find orders with COD, delivered status, sorted by updatedAt
    const codOrders = await Order.find(query)
      .sort({ updatedAt: -1 }) // Sort by updatedAt in descending order
      .select("orderId consignee collectableValue status updatedAt"); // Select only required fields

    if (!codOrders || codOrders.length === 0) {
      return res
        .status(200)
        .json({ message: "No COD delivered orders found." });
    }

    // Respond with the filtered orders
    res.status(200).json(codOrders);
  } catch (error) {
    console.error("Error fetching COD remittance orders:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  getAdminDashboard,
  getAllUsers,
  deleteUser,
  createStaff,
  updateStaffById,
  getAllStaffs,
  deleteStaff,
  getAdminMetrics,
  createUser,
  getUserById,
  deleteUserByAdmin,
  updateUser,
  getAllUserss,
  getAllShipmentsForAdmin,
  getRTCOrderForAdmin,
  fetchCodRemittanceOrders,
};
