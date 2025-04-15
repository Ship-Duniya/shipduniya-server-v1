const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth");
const { generateBulkLabels, getBarcodeUrl } = require("../controllers/labellingController");

router.post("/",  generateBulkLabels);
router.get("/",  getBarcodeUrl);

module.exports = router;
