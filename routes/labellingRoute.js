const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth");
const { generateBulkLabels, getBarcodeUrl } = require("../controllers/labellingController");

router.post("/", authMiddleware, generateBulkLabels);
router.get("/",  getBarcodeUrl); // New GET route

module.exports = router;
