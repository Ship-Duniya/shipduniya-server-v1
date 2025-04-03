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
    transactionId: {
      type: String, // Razorpay transaction ID or custom transaction ID
      required: false,
    },
    paymentId: {
      type: String, // Payment ID for external payment systems
      required: false,
    },
    awbNumber: {
      // Add the AWB number here
      type: String,
      required: false,
    },
    shipmentId: {
      // Add the shipment ID here
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
