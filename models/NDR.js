const mongoose = require("mongoose");

const NDRSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shippingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipping",
      required: true,
    },
    awb: { type: String, required: true },
    courier: {
      type: String,
      enum: ["ecom", "delhivery", "xpressbees"],
      required: true,
    },
    status: {
      type: String,
      enum: ["actionRequired", "actionRequested", "delivered", "rto"],
      default: "actionRequired",
    },
    failureReason: {
      type: String,
      enum: [
        "Pending Delivery Attempt",
        "Delivery Failed",
        "Returned to Sender (RTO)",
        "Address Incomplete",
        "Customer Unavailable",
        "Consignee Unreachable",
        "Office Closed",
        "Wrong Address",
        "COD Amount Not Ready",
        "Out of Delivery Area",
        "Delivery Restrictions",
        "Weather Related Delay",
        "Duplicate Order",
        "Address Mismatch",
        "Customer Moved",
      ],
      default: null,
    },
    reasons: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NDROrder", NDRSchema);
