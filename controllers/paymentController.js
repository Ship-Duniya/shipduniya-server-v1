const Razorpay = require("razorpay");
const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create payment
const createPayment = async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: req.body.amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${req.user.id}_${Date.now()}`, // More meaningful receipt ID
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

// Verify payment signature
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

// Create transaction details
const createTransactionDetails = async (req, res) => {
  const { id } = req.user; // Authenticated user ID
  const { orderId, paymentId, amount, currency, description } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add the amount to the user's wallet balance
    const newBalance = user.wallet + amount;

    // Create the new transaction
    const newTransaction = new Transaction({
      userId: id,
      orderId, // Store Razorpay order ID
      paymentId, // Store Razorpay payment ID
      transactionId: paymentId, // Storing the Razorpay transaction ID
      amount, // Use the actual amount from the request
      currency,
      type: "wallet", // Fixed: Should be a string, not an array
      description,
      balance: newBalance,
      status: "success",
      metadata: { additionalInfo: description }, // Store extra info
    });

    // Update the user's wallet balance
    user.wallet = newBalance;
    await user.save();

    // Save the transaction to the database
    await newTransaction.save();

    res.status(201).json({
      message: "Transaction created successfully",
      transaction: newTransaction,
    });
  } catch (error) {
    console.error("Error creating transaction details:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

module.exports = { createPayment, verifyPayment, createTransactionDetails };
