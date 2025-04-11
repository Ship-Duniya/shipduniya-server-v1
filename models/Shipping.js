const mongoose = require("mongoose");

const shippingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
      },
    ],
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    consignee: {
      type: String,
      required: true,
    },
    partnerOrderId: {
      type: String,
    },
    awbNumber: {
      type: String,
      required: true,
    },
    shipmentId: {
      type: String,
      required: true,
    },
    fwdDestinationCode: {
      type: String,
    },
    label: {
      type: String,
    },
    manifest: {
      type: String,
    },
    returnAddress: {
      name: { type: String, required: true },
      mobile: { type: String, required: true },
      pincode: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
    },
    pickupAddress: {
      name: { type: String, required: true },
      mobile: { type: String, required: true },
      pincode: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
    },
    partnerDetails: {
      name: { type: String, required: true },
      id: { type: String, required: true },
      charges: { type: Number, required: true },
    },
    priceForCustomer: {
      type: Number,
      required: true,
    },
    warehouseAddress: {
      pincode: { type: String },
      address: { type: String },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "shipped",
        "delivered",
        "rto",
        "rtc",
        "cancelled",
        "lost",
        "booked"
      ],
      default: "pending",
    },
    dgShipment: {
      type: Boolean,
      default: false,
    },
    events: {
      type: [
        {
          status: { type: String, required: true },
          timestamp: { type: Date, required: true },
          location: { type: String, required: true },
          remarks: { type: String },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shipping", shippingSchema);
