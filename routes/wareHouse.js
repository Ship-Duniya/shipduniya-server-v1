const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth");
const {
  createWarehouse,
  editWarehouse,
  fetchAllWarehouses,
  deleteWarehouse,
} = require("../controllers/warehouseController");

// Create warehouse
router.post("/", authMiddleware, createWarehouse);

// Edit warehouse
router.put("/:warehouseId", authMiddleware, editWarehouse);

// Fetch all warehouses
router.get("/", authMiddleware, fetchAllWarehouses);

// Delete warehouse
router.delete("/:warehouseId", authMiddleware, deleteWarehouse);

module.exports = router;
