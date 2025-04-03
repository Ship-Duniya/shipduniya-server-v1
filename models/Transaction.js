const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: [String],
      enum: ["wallet", "shipping", "weight_reconciliation", "refund"],
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
      type: Number,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "success", "rejected"],
      default: "pending",
    },
    transactionId: {
      type: String,
      required: false,
    },
    paymentId: {
      type: String,
      required: false,
    },
    awbNumber: {
      type: String,
      required: false,
    },
    shipmentId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
