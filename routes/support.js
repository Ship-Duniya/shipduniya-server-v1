const express = require("express");
const router = express.Router();

const { authMiddleware, roleMiddleware } = require("../middlewares/auth");

const { getSupportMetrics } = require("../controllers/supportController");

// support matrics
router.get(
  "/matrics",
  authMiddleware,
  roleMiddleware(["support"]),
  getSupportMetrics
);

module.exports = router;
