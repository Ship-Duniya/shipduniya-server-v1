const express = require("express");
const router = express.Router();

const { authMiddleware, roleMiddleware } = require("../middlewares/auth");
const {
  fetchNDROrdersForAdmin,
  fetchNDROrdersForUser,
  handleNDRAction
} = require("../controllers/ndrController");

const { trackShipmentWithLogin } = require("../controllers/shippingController");

// Only admins and superadmins can access this route
router.get(
  "/fetchall",
  authMiddleware,
  roleMiddleware(["admin", "superadmin", "support"]),
  fetchNDROrdersForAdmin
);

// Fetch NDR Orders for User
// Users can only fetch their own NDR orders
router.get(
  "/user/fetchndr",
  authMiddleware,
  roleMiddleware(["user"]),
  fetchNDROrdersForUser
);

router.post(
  "/track-with-login",
  authMiddleware,
  roleMiddleware(["user"]),
  trackShipmentWithLogin
);

// Define the route to handle NDR actions
router.post('/ndr-actions', 
    authMiddleware,
    roleMiddleware(["admin", "superadmin", "support"]), handleNDRAction);

module.exports = router;
