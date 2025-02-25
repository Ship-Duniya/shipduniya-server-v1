const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");

dotenv.config();
const app = express();
const server = http.createServer(app);
const { setupSocket } = require("./utils/socket");

require("./cron-jobs/cron");

app.use(bodyParser.json());
app.use(cors());

// Routes (import your routes here)
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const superadminRoutes = require("./routes/superadminRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const shippingRoutes = require("./routes/shippingRoutes");
const wareHouseRoutes = require("./routes/wareHouse");
const partnerRoutes = require("./routes/partner");
const calculateRoutes = require("./routes/calculate");
const trackShipmentRoutes = require("./routes/trackShipment");
const supportRoutes = require("./routes/support");
const ndrRoutes = require("./routes/ndrRoutes");
const invoiceRoutes = require("./routes/invoiceRoute");
const labelRoutes = require("./routes/labellingRoute");

app.get("/", (req, res) => {
  res.send("Welcome to Ship Duniya Server!!");
});

app.get("/api", (req, res) => {
  res.send("Welcome to Ship Duniya Server!!");
});

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/warehouse", wareHouseRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/calculate", calculateRoutes);
app.use("/api/track", trackShipmentRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/ndr", ndrRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/label", labelRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const PORT = process.env.PORT || 5000;

// Setup Socket.IO
setupSocket(server);

// Start the server
server.listen(PORT, () => {
  console.log(`Ship Duniya Server running on port ${PORT}`);
  // app.listen(PORT, "192.168.1.10", console.log(`Server running on local port ${PORT}`));
});
