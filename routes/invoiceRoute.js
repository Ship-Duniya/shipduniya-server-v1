const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middlewares/auth");

const generateMonthlyInvoice = require("../controllers/generateInvoice");

router.get(
  "/:month/:year",
  authMiddleware,
  generateMonthlyInvoice
);

module.exports = router;
