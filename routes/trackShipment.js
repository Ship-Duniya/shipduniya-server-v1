const express = require("express");
const router = express.Router();
const { trackShipment } = require("../controllers/trackShipmentController");

router.get("/:awb", trackShipment);

module.exports = router;
