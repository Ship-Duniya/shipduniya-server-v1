const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: { type: String },
    phone: { type: String },
    otp: { type: String, required: true },
    type: { type: String, enum: ["email", "phone"], required: true }, // Distinguish between email & phone OTPs
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 600 }, // OTP expires in 10 minutes
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", otpSchema);
