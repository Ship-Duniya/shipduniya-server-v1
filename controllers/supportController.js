const Ticket = require("../models/Ticket"); // Replace with the correct path
const User = require("../models/User"); // Replace with the correct path
const Order = require("../models/Order");

exports.getSupportMetrics = async (req, res) => {
  try {
    // 🔹 Fetch Ticket Metrics (Grouped by Date & Status)
    const ticketsByDateAndStatus = await Ticket.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // 🔹 Initialize response structure
    const response = {
      tickets: {
        openTickets: [],
        inProgressTickets: [],
        resolvedTickets: [],
        closedTickets: [],
      },
      ndrs: {
        openNdrs: [
          { date: "10-02-2025", value: 5 },
          { date: "11-02-2025", value: 3 },
        ],
        deliveredNdrs: [
          { date: "10-02-2025", value: 8 },
          { date: "11-02-2025", value: 6 },
        ],
        rtoNdrs: [
          { date: "10-02-2025", value: 2 },
          { date: "11-02-2025", value: 4 },
        ],
      },
    };

    // 🔹 Populate Ticket Data
    ticketsByDateAndStatus.forEach((ticket) => {
      const { date, status } = ticket._id;
      const entry = { date, value: ticket.count };

      if (status === "open") {
        response.tickets.openTickets.push(entry);
      } else if (status === "in-progress") {
        response.tickets.inProgressTickets.push(entry);
      } else if (status === "resolved") {
        response.tickets.resolvedTickets.push(entry);
      } else if (status === "closed") {
        response.tickets.closedTickets.push(entry);
      }
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching support metrics:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
