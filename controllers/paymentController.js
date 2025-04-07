const Razorpay = require("razorpay");
const crypto = require("crypto");
const shortid = require("shortid"); // For generating short receipt IDs
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create a new payment order
const createPayment = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `rcpt_${shortid.generate()}`, // Ensure receipt is within 40 chars
    });

    if (!order) {
      return res.status(500).json({ message: "Error creating Razorpay order" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Verify Razorpay payment signature
const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  try {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    res.status(200).json({
      message: "Payment verified successfully",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Create a transaction record after successful payment
const createTransactionDetails = async (req, res) => {
  const { id } = req.user; // Authenticated user ID
  const { orderId, paymentId, amount } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update wallet balance
    user.wallet += amount;
    await user.save();

    // Create Transaction record
    const transaction = await Transaction.create({
      userId: id,
      type: ["wallet", "payment"], // Payment type
      debitAmount: 0, // No debit
      creditAmount: amount, // Wallet top-up
      currency: "INR",
      balance: user.wallet, // Updated wallet balance
      description: `Wallet top-up via Razorpay (Order ID: ${orderId})`,
      status: "success",
      transactionId: paymentId, // Razorpay payment ID is unique
      transactionMode: "razorpay", // Mode is razorpay
    });

    res.status(201).json({
      message: "Wallet recharged successfully",
      transactionId: transaction._id,
      walletBalance: user.wallet,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

module.exports = { createPayment, verifyPayment, createTransactionDetails };
