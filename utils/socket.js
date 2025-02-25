const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Ticket = require("../models/Ticket");
const { authMiddleware } = require("../middlewares/auth");

let io;

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // Adjust accordingly
      methods: ["GET", "POST"],
    },
  });

  io.use(authMiddleware); // Use auth middleware to validate JWT

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Extracting userId and role from the socket (from the middleware)
    const { userId, role } = socket;

    // Listen for joining a specific ticket room
    socket.on("joinTicket", async (ticketId) => {
      console.log(`User ${userId} joined ticket room: ${ticketId}`);

      try {
        const ticket = await Ticket.findById(ticketId);

        // Ensure the ticket exists
        if (!ticket) {
          return socket.emit("error", "Ticket not found.");
        }

        // Check if the user is authorized to join the ticket room
        if (ticket.userId !== userId && role !== "support") {
          return socket.emit("error", "Unauthorized to join this ticket room.");
        }

        socket.join(ticketId); // Allow the user or support role to join
        console.log(`User ${userId} joined ticket room successfully.`);
      } catch (error) {
        console.error("Error while joining ticket room:", error.message);
        socket.emit("error", "Failed to join the ticket room.");
      }
    });

    // Listen for chat messages on a ticket
    socket.on("sendMessage", async ({ ticketId, message }, callback) => {
      console.log(`Message on ticket ${ticketId}:`, message);

      try {
        // Emit the message to all users in the ticket room
        io.to(ticketId).emit("receiveMessage", { sender: userId, message });

        // Acknowledge the message sent
        callback({ status: "success", message: "Message sent successfully." });

        // Optionally save the message to the ticket (for persistence)
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return;

        ticket.messages.push({ sender: "user", message });
        ticket.updatedAt = new Date();
        await ticket.save();
      } catch (err) {
        console.error("Failed to save message:", err.message);
        callback({ status: "error", message: "Failed to send message." });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
    });
  });
}

module.exports = { setupSocket };
