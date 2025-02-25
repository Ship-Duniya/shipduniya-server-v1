const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Order = require("../models/Order");
const OtpModel = require("../models/Otp");
const Ticket = require("../models/Ticket");
const { generateId } = require("../utils/helpers");
const chargesSheet = require("../chargesSheet");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res
        .status(404)
        .json({ message: "User does not exist. Please sign up." });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    console.log(otp);

    // Save OTP to the database
    await OtpModel.findOneAndUpdate(
      { email },
      { email, otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent successfully to your email." });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res
      .status(500)
      .json({ message: "Error sending OTP. Please try again later." });
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required." });
  }

  try {
    const otpInDatabase = await OtpModel.findOne({ email });

    if (!otpInDatabase || otpInDatabase.otp !== parseInt(otp, 10)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await OtpModel.deleteOne({ email });

    res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Failed to verify OTP." });
  }
};

const forgotPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and new password are required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.password = password; // Ensure password hashing is applied
    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password." });
  }
};

// User registration
const registerUser = async (req, res) => {
  const { name, email, password, mobile, terms } = req.body;

  try {
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (terms === false) {
      return res
        .status(400)
        .json({ message: "Please accept the terms & conditions" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      name,
      email,
      phone: mobile,
      password: hashedPassword,
      userId: generateId("user"),
    });
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      _id: user._id,
      userId: generateId("user"),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// User login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and new password are required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password." });
  }
};

// Get Single User by ID
const getUserProfile = async (req, res) => {
  try {
    // Validate that the request contains a valid user ID
    if (!req.user || !req.user.id) {
      return res
        .status(400)
        .json({ message: "Invalid request: User ID is missing" });
    }

    // Fetch the user by ID
    const user = await User.findById(req.user.id);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user data
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);

    // Handle different types of errors
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid User ID format" });
    }

    // Catch any other server-side errors
    return res.status(500).json({
      message: "An error occurred while fetching user profile",
      error: error.message,
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update basic profile details
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.gstNumber = req.body.gstNumber || user.gstNumber;
    user.panNumber = req.body.panNumber || user.panNumber;
    user.aadharNumber = req.body.aadharNumber || user.aadharNumber;
    user.address = req.body.address || user.address;
    user.pincode = req.body.pincode || user.pincode;

    // Update bank account details
    if (req.body.bankDetails) {
      user.bankDetails.forEach((bankDetail, index) => {
        if (req.body.bankDetails[index]) {
          const updatedBankDetail = req.body.bankDetails[index];

          bankDetail.accountHolderName =
            updatedBankDetail.accountHolderName || bankDetail.accountHolderName;
          bankDetail.bankName =
            updatedBankDetail.bankName || bankDetail.bankName;
          bankDetail.accountNumber =
            updatedBankDetail.accountNumber || bankDetail.accountNumber;
          bankDetail.ifscCode =
            updatedBankDetail.ifscCode || bankDetail.ifscCode;
          bankDetail.accountType =
            updatedBankDetail.accountType || bankDetail.accountType;
          bankDetail.branchName =
            updatedBankDetail.branchName || bankDetail.branchName;
        }
      });
    }

    // Ensure metrics are not updated by the user directly
    if (req.body.metrics) {
      return res
        .status(400)
        .json({ message: "Cannot update metrics directly" });
    }

    // Save the updated user profile
    await user.save();
    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error while updating profile" });
  }
};

const updateUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.customerType = req.body.customerType || user.customerType;
    if (req.body.password) {
      user.password = await bcrypt.hash(req.body.password, 10);
    }

    await user.save();
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};

const deleteUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await Ticket.deleteMany({ userId: user._id });
    const deleteduser = await User.findByIdAndDelete(req.params.userId);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};

const getUserBankAccounts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user.bankDetails);
  } catch (error) {
    res.status(500).json({ message: "Error fetching Account details", error });
  }
};

// Add another account to a User
const addBankDetail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.bankDetails.push(req.body);
    await user.save();

    res.status(201).json({
      message: "Account detail added successfully",
      bankDetails: user.bankDetails,
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding Account detail", error });
  }
};

// Delete a account Detail of a user
const deleteBankDetailById = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bankDetail = user.bankDetails.id(req.params.bankDetailId);
    if (!bankDetail) {
      return res.status(404).json({ message: "Account detail not found" });
    }

    bankDetail.remove();
    await user.save();

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Account could not be deleted", error });
  }
};

const getUserMetrics = async (req, res) => {
  try {
    // Fetch userId from req.user.id
    const userId = req.user.id;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch all shipped orders for the user (only orders where shipped is true)
    const orders = await Order.find({ userId, shipped: true });

    // Check if there are any shipped orders
    if (!orders.length) {
      return res.status(200).json({
        totalParcels: [],
        totalDelivered: [],
        totalRTO: [],
        totalPendingPickup: [],
        totalInTransit: [],
        totalLost: [],
      });
    }

    // Initialize metrics map for each category
    const metrics = {
      totalParcels: [],
      totalDelivered: [],
      totalRTO: [],
      totalPendingPickup: [],
      totalInTransit: [],
      totalLost: [],
    };

    // Group orders by date and partner for each metric
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0]; // Format: YYYY-MM-DD
      const formattedDate = date.split("-").reverse().join("-"); // Convert to DD-MM-YYYY
      const partner = order.partner;

      // Function to initialize or increment a key in metrics array
      const incrementMetric = (metricKey) => {
        const existingMetric = metrics[metricKey].find(
          (item) => item.date === formattedDate && item.partner === partner
        );

        if (existingMetric) {
          existingMetric.value += 1;
        } else {
          metrics[metricKey].push({
            date: formattedDate,
            partner: partner,
            value: 1,
          });
        }
      };

      // Increment Total Parcels for every shipped order
      incrementMetric("totalParcels");

      // Increment specific metrics based on order status
      const status = order.status.toLowerCase();
      if (status === "delivered") incrementMetric("totalDelivered");
      else if (status === "rto") incrementMetric("totalRTO");
      else if (status === "pending pickup")
        incrementMetric("totalPendingPickup");
      else if (status === "in transit") incrementMetric("totalInTransit");
      else if (status === "lost") incrementMetric("totalLost");
    });

    // Ensure that the date format is consistent across all categories
    const formatResponse = (data) => {
      // Sort by date and partner (ascending order)
      return data.sort((a, b) => {
        const dateA = new Date(a.date.split("-").reverse().join("-"));
        const dateB = new Date(b.date.split("-").reverse().join("-"));
        return dateA - dateB;
      });
    };

    // Return the response in the required format
    const response = {
      totalparcels: formatResponse(metrics.totalParcels),
      totaldelivered: formatResponse(metrics.totalDelivered),
      totalrto: formatResponse(metrics.totalRTO),
      totalpendingpickup: formatResponse(metrics.totalPendingPickup),
      totalIntransit: formatResponse(metrics.totalInTransit),
      totallost: formatResponse(metrics.totalLost),
    };

    // Return the metrics data
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching user metrics:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const addBankAccount = async (req, res) => {
  try {
    // Validate that the request contains a valid user ID
    if (!req.user || !req.user.id) {
      return res
        .status(400)
        .json({ message: "Invalid request: User ID is missing" });
    }

    const {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      accountType,
      branchName,
    } = req.body;

    // Validate the input fields
    if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    // Validate the IFSC code format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode)) {
      return res.status(400).json({ message: "Invalid IFSC code format" });
    }

    // Find the user by ID
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a new bank account object
    const newBankAccount = {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      accountType,
      branchName,
    };

    // Add the new bank account to the user's bankDetails array
    user.bankDetails.push(newBankAccount);

    await user.save();

    return res.status(201).json({
      message: "Bank account added successfully",
      bankDetails: user.bankDetails,
    });
  } catch (error) {
    console.error("Error adding bank account:", error.message);
    return res.status(500).json({
      message: "An error occurred while adding bank account",
      error: error.message,
    });
  }
};

const deleteBankAccount = async (req, res) => {
  try {
    // Validate that the request contains a valid user ID
    if (!req.user || !req.user.id) {
      return res
        .status(400)
        .json({ message: "Invalid request: User ID is missing" });
    }

    const { bankAccountId } = req.params;

    // Validate the input fields
    if (!bankAccountId) {
      return res
        .status(400)
        .json({ message: "Bank account ID must be provided" });
    }

    // Find the user by ID
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the index of the bank account to be removed using the `_id`
    const accountIndex = user.bankDetails.findIndex(
      (account) => account._id.toString() === bankAccountId
    );

    if (accountIndex === -1) {
      return res.status(404).json({ message: "Bank account not found" });
    }

    // Remove the bank account from the array
    user.bankDetails.splice(accountIndex, 1);

    await user.save();

    return res.status(200).json({
      message: "Bank account deleted successfully",
      bankDetails: user.bankDetails,
    });
  } catch (error) {
    console.error("Error deleting bank account:", error.message);
    return res.status(500).json({
      message: "An error occurred while deleting the bank account",
      error: error.message,
    });
  }
};

const fetchUserCodRemittanceOrders = async (req, res) => {
  try {
    const userId = req.user.id; // Extract userId from the token via `authenticate` middleware

    let query = {
      orderType: "COD",
      status: "delivered",
      userId: userId, // Ensure users see only their own orders
    };

    // Query: Find orders with COD, delivered status, sorted by updatedAt
    const userCodOrders = await Order.find(query).sort({ updatedAt: -1 });

    if (!userCodOrders || userCodOrders.length === 0) {
      return res
        .status(200)
        .json({ message: "No COD delivered orders found for this user." });
    }

    // Respond with the filtered orders
    res.status(200).json(userCodOrders);
  } catch (error) {
    console.error("Error fetching user COD remittance orders:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Update the active bank for a user.
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const updateActiveBank = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bankId } = req.body;

    if (!bankId) {
      return res.status(400).json({
        success: false,
        error: "Bank ID is required.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    // Check if the bank exists in the user's bankDetails
    const bankIndex = user.bankDetails.findIndex(
      (b) => b._id.toString() === bankId
    );

    if (bankIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Bank not found in user's account.",
      });
    }

    // Set all banks to isActive: false
    user.bankDetails.forEach((bank) => (bank.isActive = false));

    // Set the selected bank to isActive: true
    user.bankDetails[bankIndex].isActive = true;

    // Save the updated user data
    await user.save();

    res.status(200).json({
      success: true,
      message: "Active bank updated successfully.",
      bankDetails: user.bankDetails,
    });
  } catch (error) {
    console.error("Error updating active bank:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to update active bank.",
      details: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateUserById,
  updateUserById,
  deleteUserById,
  getUserBankAccounts,
  addBankDetail,
  deleteBankDetailById,
  getUserMetrics,
  addBankAccount,
  deleteBankAccount,
  fetchUserCodRemittanceOrders,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  updateActiveBank,
};
