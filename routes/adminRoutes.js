const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middlewares/auth");
const {
  getAllUsers,
  deleteUser,
  getAdminDashboard,
  updateCustomerType,
  getAdminMetrics,
  createUser,
  getUserById,
  deleteUserByAdmin,
  updateUser,
  getAllUserss,
  getAllShipmentsForAdmin,
  getRTCOrderForAdmin,
  fetchCodRemittanceOrders,
} = require("../controllers/adminController");

// Admin dashboard
router.get(
  "/dashboard",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAdminDashboard
);

// Manage users
router.get(
  "/users",
  authMiddleware,
  roleMiddleware(["support", "admin", "superadmin"]),
  getAllUsers
);
router.delete(
  "/user/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deleteUser
);

router.get(
  "/matrics",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAdminMetrics
);

// Admin user management routes
router.post(
  "/user",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  createUser
);

router.get(
  "/user/:userId",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getUserById
);

router.put(
  "/user/:userId",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  updateUser
);

router.delete(
  "/user/:userId",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deleteUser
);

// Additional route for getAllUserss
router.get(
  "/fetchusers",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllUserss
);

router.get(
  "/all-shipments",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllShipmentsForAdmin
);

router.get(
  "/rtcorders",
  // authMiddleware,
  // roleMiddleware(["admin", "superadmin"]),
  getRTCOrderForAdmin
);

// Route for fetching COD remittance orders
router.get(
  "/fetch-cod-remittance",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  fetchCodRemittanceOrders
);

module.exports = router;
