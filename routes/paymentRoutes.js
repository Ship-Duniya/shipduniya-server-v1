const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth");
const {
  createPayment,
  verifyPayment,
  updatePaymentDetails,
  createTransactionDetails,
} = require("../controllers/paymentController");

// Create a payment
router.post("/create", authMiddleware, createPayment);

// Verify payment
router.post("/verify", authMiddleware, verifyPayment);

router.post("/update", authMiddleware, createTransactionDetails);

module.exports = router;
