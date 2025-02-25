const mongoose = require("mongoose");

const NDRSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    awb: { type: String, required: true },
    courier: {
      type: String,
      enum: ["ecom", "delhivery", "xpressbees"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "delivered", "undelivered", "returned", "failed"],
      default: "pending",
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
