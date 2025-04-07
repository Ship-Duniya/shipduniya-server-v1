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
    rtoExtraWeightCharges: {
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

    // 🆕 🆕 Newly added fields for Invoice
    orderId: {
      type: String,
    },
    paymentType: {
      type: String,
    },
    pincode: {
      type: String,
    },
    city: {
      type: String,
    },
    zone: {
      type: String,
    },
    originCity: {
      type: String,
    },
    originState: {
      type: String,
    },
    destinationCity: {
      type: String,
    },
    destinationState: {
      type: String,
    },
    pickupPincode: {
      type: String,
    },
    chargedWeight: {
      type: Number,
      default: 0,
    },
    gst: {
      type: Number,
      default: 0,
    },
    sgst: {
      type: Number,
      default: 0,
    },
    cgst: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
