const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { authMiddleware, roleMiddleware } = require("../middlewares/auth");
const {
  createForwardOrder,
  createReverseOrder,
  editOrderByUser,
  getOrders,
  deleteOrderByUser,
  getOrderByID,
  softDeleteOrderByUser,
} = require("../controllers/OrderController");

// router.post('/create', authMiddleware, createOrder);
router.post("/create-forward-order", authMiddleware, createForwardOrder);

// Route for editing an order by the user
router.put("/:orderId", authMiddleware, editOrderByUser);

router.post(
  "/create-forward-order/bulk",
  authMiddleware,
  upload.single("file"),
  createForwardOrder
);

router.post("/create-reverse-order", authMiddleware, createReverseOrder);

router.get("/", authMiddleware, getOrders);
router.patch("/delete/:id", authMiddleware, softDeleteOrderByUser);
router.get("/:id", authMiddleware, getOrderByID);

//edit order

module.exports = router;
