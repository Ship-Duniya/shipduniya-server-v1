// partnerChargeRouter.js
const express = require("express");
const { fetchAllPartners } = require("../controllers/partnerController"); // Import controller

const router = express.Router();

// Route to calculate charges for all orders
router.post("/calculate-charges", fetchAllPartners);

module.exports = router;
