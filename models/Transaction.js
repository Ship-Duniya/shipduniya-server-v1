const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: [String], // Array of strings to allow multiple types
      enum: ["wallet", "shipping", "weight_reconciliation"],
      default: "wallet",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    balance: {
      type: Number, // Track wallet balance after the transaction
    },
    description: {
      type: String, // Provide details like "Wallet top-up", "Shipping charge", etc.
    },
    status: {
      type: String,
      enum: ["pending", "success", "rejected"],
      default: "pending",
    },
    metadata: {
      type: Object, // Store additional data, e.g., shipment ID or weight details
    },
    transactionId: {
      // New field for storing Razorpay transaction ID
      type: String,
      required: false, // This can be optional for all types except wallet transactions
    },
    paymentId: {
      // New field for storing payment ID
      type: String,
      required: false, // Optional field that can be used for various payment systems
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
