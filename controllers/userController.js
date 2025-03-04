const bcrypt = require("bcryptjs");
require("dotenv").config();
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Order = require("../models/Order");
const OtpModel = require("../models/Otp");
const Ticket = require("../models/Ticket");
const { generateId } = require("../utils/helpers");
const chargesSheet = require("../chargesSheet");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendOtp = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ message: "Email and phone are required." });
    }

    // Generate separate OTPs for email & phone
    const emailOtp = Math.floor(1000 + Math.random() * 9000);
    const phoneOtp = Math.floor(1000 + Math.random() * 9000);
    console.log(`Email OTP: ${emailOtp}, Phone OTP: ${phoneOtp}`);

    // Save OTPs in the database (overwrite if exists)
    await OtpModel.findOneAndUpdate(
      { email, phone },
      { email, phone, emailOtp, phoneOtp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Send OTP via Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Email OTP",
      text: `Your OTP for email verification is ${emailOtp}. It expires in 10 minutes.`,
    });

    // Send OTP via Twilio SMS
    await twilioClient.messages.create({
      body: `Your OTP for phone verification is ${phoneOtp}. It expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone, // Ensure phone number is in E.164 format (+91 for India)
    });

    res.status(200).json({ message: "OTP sent to email and phone." });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Error sending OTP. Try again later." });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, phone, emailOtp, phoneOtp } = req.body;

    if (!email || !phone || !emailOtp || !phoneOtp) {
      return res.status(400).json({ message: "Both OTPs are required." });
    }

    const otpRecord = await OtpModel.findOne({ email, phone });

    if (!otpRecord) {
      return res.status(400).json({ message: "OTP record not found." });
    }

    if (
      otpRecord.emailOtp !== parseInt(emailOtp, 10) ||
      otpRecord.phoneOtp !== parseInt(phoneOtp, 10)
    ) {
      return res.status(400).json({ message: "Invalid OTPs. Try again." });
    }

    // Mark OTP as verified
    await OtpModel.updateOne({ email, phone }, { verified: true });

    res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP." });
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

const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, terms } = req.body;

    // Ensure OTP verification is completed
    const otpVerified = await OtpModel.findOne({ email, phone, verified: true });

    if (!otpVerified) {
      return res.status(400).json({ message: "Please verify OTPs first." });
    }

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ message: "User already exists." });
    }

    if (!terms) {
      return res.status(400).json({ message: "Please accept terms & conditions." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Delete OTP record after registration
    await OtpModel.deleteOne({ email, phone });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
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
      { expiresIn: "1d" }
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

//Edit Bank details
const editBankDetail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { bankId } = req.params;
    const bankDetailIndex = user.bankDetails.findIndex(
      (detail) => detail._id.toString() === bankId
    );

    if (bankDetailIndex === -1) {
      return res.status(404).json({ message: "Bank detail not found" });
    }

    user.bankDetails[bankDetailIndex] = {
      ...user.bankDetails[bankDetailIndex],
      ...req.body,
    };
    await user.save();

    res.status(200).json({
      message: "Bank detail updated successfully",
      bankDetails: user.bankDetails,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating bank detail", error });
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
  editBankDetail,
};
