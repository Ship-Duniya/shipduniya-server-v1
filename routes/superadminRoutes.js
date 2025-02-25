const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middlewares/auth");
const { getSuperAdminMetrics } = require("../controllers/superAdminController");
const {
  getAllStaffs,
  updateStaffById,
  createStaff,
  deleteStaff,
} = require("../controllers/adminController");

router.get(
  "/staffs",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  getAllStaffs
);
router.post(
  "/staffs",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  createStaff
);
router.put(
  "/staff/:id",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  updateStaffById
);
router.delete(
  "/staff/:id",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  deleteStaff
);

// Create new admin (superadmin only)

// Super Admin metrics route
router.get(
  "/matrics",
  // authMiddleware,
  // roleMiddleware(["superadmin"]),
  getSuperAdminMetrics
);

module.exports = router;
