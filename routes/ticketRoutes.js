// routes/ticketRoutes.js
const express = require("express");
const router = express.Router();
const { authMiddleware, roleMiddleware } = require("../middlewares/auth");
const {
  raiseTicket,
  uploadMiddleware,
  viewTickets,
  viewAllTickets,
  chatOnTicket,
  transferTicketToVendor,
  updateTicketStatus,
} = require("../controllers/ticketController");

// Route for raising a ticket
router.post("/raise", authMiddleware, uploadMiddleware, raiseTicket);

// Change a ticket status
router.put(
  "/:ticketId/status",
  authMiddleware,
  roleMiddleware(["support"]),
  updateTicketStatus
);

// Route for viewing tickets (user-specific)
router.get("/view", authMiddleware, viewTickets);

// Route for chatting on a ticket
router.post("/:ticketId/chat", authMiddleware, chatOnTicket);

// Route for viewing all tickets (only support role)
router.get("/all", authMiddleware, roleMiddleware(["support"]), viewAllTickets);

// Route for transferring a ticket to a vendor
router.post(
  "/:ticketId/transfer-to-vendor",
  authMiddleware,
  roleMiddleware(["support"]),
  transferTicketToVendor
);

module.exports = router;
