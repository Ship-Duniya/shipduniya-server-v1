const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: { type: String, required: true },
  emailOtp: { type: Number, required: true },
  phoneOtp: { type: Number, required: true },
  verified: { type: Boolean, default: false }, // Track if OTPs are verified
  createdAt: { type: Date, default: Date.now, expires: 600 }, // Auto-delete after 10 minutes
});

module.exports = mongoose.model("Otp", otpSchema);
