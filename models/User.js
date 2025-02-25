const mongoose = require("mongoose");

// Bank details schema (unchanged)
const bankDetailsSchema = new mongoose.Schema({
  accountHolderName: { type: String },
  bankName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String, match: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
  accountType: {
    type: String,
    enum: ["savings", "current"],
    default: "savings",
  },
  branchName: { type: String },
  isActive: {
    type: String,
    default: false,
  },
});

// Metrics schema for tracking partner-wise parcel statistics
const partnerMetricsSchema = new mongoose.Schema({
  date: { type: String },
  partner: { type: String },
  count: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
    },
    password: { type: String },
    role: {
      type: String,
      enum: ["user", "admin", "support", "superadmin"],
      default: "user",
    },
    userType: {
      type: String,
      enum: ["wp", "dp"],
      default: "dp",
    },
    address: {
      type: String,
      default: "",
    },
    pincode: {
      type: String,
    },
    orders: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Order",
    },
    tickets: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Ticket",
    },
    wallet: {
      type: Number,
      default: 0,
    },
    gstNumber: {
      type: String,
      match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    },
    panNumber: {
      type: String,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    },
    aadharNumber: {
      type: String,
    },
    bankDetails: {
      type: [bankDetailsSchema],
    },
    customerType: {
      type: String,
      enum: ["bronze", "silver", "gold", "diamond"],
      default: "bronze",
    },
    warehouses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
      },
    ],
    metrics: {
      type: [partnerMetricsSchema],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
