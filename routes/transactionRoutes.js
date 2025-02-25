const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middlewares/auth");
const {
  getAllTransactionsOfUser,
  getAllTransactionsGroupedByUser,
} = require("../controllers/transactionController");

// Admin dashboard
router.get("/", authMiddleware, getAllTransactionsOfUser);

// Get all transactions grouped by user (admin/superadmin only)
router.get(
  "/admin",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllTransactionsGroupedByUser
);

module.exports = router;
