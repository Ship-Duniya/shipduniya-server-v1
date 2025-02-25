const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middlewares/auth");
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateUserById,
  deleteUserById,
  getUserBankAccounts,
  addBankDetail,
  deleteBankDetailById,
  getUserMetrics,
  addBankAccount,
  deleteBankAccount,
  fetchUserCodRemittanceOrders,
  sendOtp,
  verifyOtp,
  resetPassword,
  updateActiveBank,
} = require("../controllers/userController");

// User registration
router.post("/register", registerUser);

// User login
router.post("/login", loginUser);

// Get Single User by ID
router.get("/profile", authMiddleware, getUserProfile);

// Update User by ID
router.put("/profile", authMiddleware, updateUserProfile);

// Delete User by ID
router.delete("/:userId", authMiddleware, deleteUserById);

// Delete User by ID
router.patch("/:userId", authMiddleware, updateUserById);

// Get All Bank Accounts for a User
router.get("/bank-details", authMiddleware, getUserBankAccounts);

// Add Bank Account to a User
router.post("/bank-details", authMiddleware, addBankDetail);

// Delete a Bank's Account of a user
router.delete(
  "/bank-details/:bankDetailId",
  authMiddleware,
  deleteBankDetailById
);

// Route to get metrics for the logged-in user
router.get("/matrics", authMiddleware, getUserMetrics);

// Route to add a new bank account
router.post("/add-bank-account", authMiddleware, addBankAccount);

// Route to delete a bank account
router.delete(
  "/bank-account/:bankAccountId",
  authMiddleware,
  deleteBankAccount
);

router.get(
  "/codremittance",
  authMiddleware,
  roleMiddleware(["user"]),
  fetchUserCodRemittanceOrders
);

// OTP routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

router.put("/activebank", authMiddleware, updateActiveBank);

module.exports = router;
