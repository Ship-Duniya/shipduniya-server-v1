const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middlewares/auth");
const {
  // createShipping,
  createForwardShipping,
  createReverseShipping,
  getUserShipments,
  getShippings,
  fetchCodRemittanceOrders,
  fetchAdminRemittanceSummary,
  fetchRemittanceSummary,
  trackShipment,
  getShippingDetailsByAWB,
  getShippingDetailsByShipmentId,
  fetchNDROrders,
  requestRemittance,
  approveRemittance,
  trackShipmentWithLogin,
  trackShipmentWithoutLogin,
  verifyAWB,
  handleNDRAndRTO,
  fetchRTOShipments,
  fetchRTCShipments,
  updateShipmentStatusToRTC,
  fetchUserRTCShipments,
  fetchUserRTOShipments,
  //   getShippingById,
  //   updateShipping,
  //   deleteShipping,
  //   getUserShippings
} = require("../controllers/shippingController");

// Create a shipping record
// router.post('/create', authMiddleware, createShipping);

// Define the POST route for creating forward shipping
router.post("/create-forward-shipping", authMiddleware, createForwardShipping);

// Route for reverse shipping (bulk and single)
router.post("/reverse-shipping", authMiddleware, createReverseShipping);

// Get a user shipping records
router.get("/userShipments", authMiddleware, getUserShipments);

// Get all shipping records
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getShippings
);

//cod-remittance
router.get("/cod-remittance", authMiddleware, fetchCodRemittanceOrders);

// Route for fetching COD remittance summary
router.get(
  "/cod-admin-remittance-summary",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  fetchAdminRemittanceSummary
);

router.get(
  "/cod-remittance-summary",
  authMiddleware,
  roleMiddleware(["user"]),
  fetchRemittanceSummary
);

// Route to get shipping details by AWB number
router.post("/by-awb", authMiddleware, getShippingDetailsByAWB);

// Route to get shipping details by shipment ID
router.post("/by-shipment-id", authMiddleware, getShippingDetailsByShipmentId);

// Route to handle NDR
router.get("/ndr", authMiddleware, fetchNDROrders);

// Route for requesting remittance (Admin)
router.post(
  "/request-remittance",
  authMiddleware,
  roleMiddleware(["admin"]),
  requestRemittance
);

// Route for approving remittance (Superadmin)
router.patch(
  "/approve-remittance/:requestId",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  approveRemittance
);

// Route to track shipment with login
router.post(
  "/track-with-login",
  authMiddleware,
  roleMiddleware(["user"]),
  trackShipmentWithLogin
);

// Route to track shipment without login
router.post("/track-without-login", trackShipmentWithoutLogin);

router.post("/verify-awb", authMiddleware, roleMiddleware(["user"]), verifyAWB);

router.post(
  "/handle-ndr-rto",
  authMiddleware,
  roleMiddleware(["user"]),
  handleNDRAndRTO
);

// Fetch all RTO shipments
router.get(
  "/rto-shipments",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  fetchRTOShipments
);

// Fetch all RTC shipments
router.get(
  "/rtc-shipments",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  fetchRTCShipments
);

// Change shipment status from RTO to RTC
router.patch(
  "/update-to-rtc",
  authMiddleware,
  roleMiddleware(["support", "admin", "superadmin"]),
  updateShipmentStatusToRTC
);

// Fetch user's RTO shipments (User only)
router.get(
  "/user-rto-shipments",
  authMiddleware,
  roleMiddleware(["user"]),
  fetchUserRTOShipments
);

// Fetch user's RTC shipments (User only)
router.get(
  "/user-rtc-shipments",
  authMiddleware,
  roleMiddleware(["user"]),
  fetchUserRTCShipments
);

// // Get a single shipping record by ID
// router.get('/:id', authMiddleware, getShippingById);

// // Update a shipping record by ID
// router.put('/:id', authMiddleware, updateShipping);

// // Delete a shipping record by ID
// router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteShipping);

// router.get('/awb/:id', authMiddleware, getAwbDetails);

module.exports = router;
