const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Ensure this is always present
    },
    orderId: {
      type: String,
      required: true,
      unique: true, // Ensure orderId is unique
    },
    orderType: {
      type: String,
      enum: ["COD", "PREPAID"],
      required: true, // Make orderType required
    },
    consignee: {
      type: String,
      required: true, // Ensure consignee name is present
    },
    consigneeAddress1: {
      type: String,
      required: true, // Required for complete address
    },
    consigneeAddress2: {
      type: String,
    },
    city: {
      type: String,
      required: true, // Required for address
    },
    state: {
      type: String,
      required: true, // Required for address
    },
    pincode: {
      type: String,
      required: true, // Required for address
    },
    telephone: {
      type: String,
    },
    mobile: {
      type: String,
      required: true,
    },
    collectableValue: {
      type: Number,
      default: 0, // Default value if not specified
    },
    declaredValue: {
      type: Number,
      default: 0, // Default value if not specified
    },
    itemDescription: {
      type: String,
    },
    dgShipment: {
      type: Boolean,
      default: false,
    },
    quantity: {
      type: Number,
      min: [1, "Quantity must be at least 1"], // Ensure quantity is valid
    },
    height: {
      type: Number,
      min: [0, "Height must be a positive number"], // Validation for positive numbers
    },
    breadth: {
      type: Number,
      min: [0, "Breadth must be a positive number"], // Validation for positive numbers
    },
    length: {
      type: Number,
      min: [0, "Length must be a positive number"], // Validation for positive numbers
    },
    volumetricWeight: {
      type: Number,
      default: 0,
    },
    actualWeight: {
      type: Number,
      min: [0, "Weight must be a positive number"], // Validation for positive numbers
    },
    invoiceNumber: {
      type: String,
    },
    shipped: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "in-transit", "delivered", "rto", "lost", "cancelled","ndr"],
      default: "pending",
    },
    partner: {
      type: String,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    events: {
      type: [
        {
          status: { type: String, required: true },
          timestamp: { type: Date, required: true },
          location: { type: String },
          remarks: { type: String },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
  }
);

module.exports = mongoose.model("Order", orderSchema);
