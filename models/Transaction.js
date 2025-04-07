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
      required: true,
    },

    // Separate debit and credit
    debitAmount: {
      type: Number,
      default: 0,
    },
    creditAmount: {
      type: Number,
      default: 0,
    },

    amount: {
      type: Number,
      required: true,
      comment: "Total amount value for the transaction",
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

    transactionMode: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },

    transactionId: {
      type: String,
      unique: true,
    },

    paymentId: {
      type: String,
    },

    // 🚚 Shipping specific fields
    courier: {
      type: String,
      required: function () {
        return this.type.includes("shipping");
      },
    },
    awbNumber: {
      type: String,
      required: function () {
        return this.type.includes("shipping");
      },
    },
    shipmentId: {
      type: String,
    },

    freightCharges: {
      type: Number,
      default: 0,
    },
    codCharges: {
      type: Number,
      default: 0,
    },
    enteredWeight: {
      type: Number,
      default: 0,
    },
    enteredDimension: {
      type: String,
      default: "N/A",
    },
    appliedWeight: {
      type: Number,
      default: 0,
    },
    extraWeightCharges: {
      type: Number,
      default: 0,
    },
    rtoCharges: {
      type: Number,
      default: 0,
    },
    freightReverse: {
      type: Number,
      default: 0,
    },
    codChargeReverse: {
      type: Number,
      default: 0,
    },
    rtoExtraWeightCharges: {
      type: Number,
      default: 0,
    },
    totalCharges: {
      type: Number,
      default: 0,
    },

    // 🏋️‍♂️ Weight Reconciliation fields
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    weight: {
      type: Number,
      default: 0,
    },
    length: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    slab: {
      type: String,
    },
    volumetricWeight: {
      type: Number,
      default: 0,
    },
    forward: {
      type: Number,
      default: 0,
    },
    chargedToWallet: {
      type: Number,
      default: 0,
    },
    productDescription: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
