// Import necessary models
const User = require("../models/User");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");
const Transaction = require("../models/Transaction");

const getSuperAdminMetrics = async (req, res) => {
  try {
    // Group Users by creation date (global scope, all users)
    const usersByDate = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Group Orders by creation date and status (global scope, all orders)
    const ordersByDate = await Order.aggregate([
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

    // Group Tickets by creation date and status (global scope, all tickets)
    const ticketsByDate = await Ticket.aggregate([
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

    // Group Transactions by creation date (global scope, all transactions)
    const transactionsByDate = await Transaction.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Transform data into required format
    const metrics = {};

    usersByDate.forEach((user) => {
      const date = user._id;
      metrics[date] = metrics[date] || {};
      metrics[date].TotalUsers = user.count;
    });

    ordersByDate.forEach((order) => {
      const { date, status } = order._id;
      metrics[date] = metrics[date] || {};

      if (status === "pending") {
        metrics[date].PendingOrders = order.count;
      } else if (status === "delivered") {
        metrics[date].DeliveredOrders = order.count;
      }
    });

    ticketsByDate.forEach((ticket) => {
      const { date, status } = ticket._id;
      metrics[date] = metrics[date] || {};

      if (status === "resolved") {
        metrics[date].ResolvedTickets = ticket.count;
      } else {
        metrics[date].UnresolvedTickets = ticket.count;
      }
    });

    transactionsByDate.forEach((transaction) => {
      const date = transaction._id;
      metrics[date] = metrics[date] || {};
      metrics[date].TotalTransactions = transaction.count;
    });

    // Merge and ensure all dates have all metrics
    const formattedResponse = Object.keys(metrics).map((date) => ({
      Date: date,
      TotalUsers: metrics[date].TotalUsers || 0,
      PendingOrders: metrics[date].PendingOrders || 0,
      DeliveredOrders: metrics[date].DeliveredOrders || 0,
      ResolvedTickets: metrics[date].ResolvedTickets || 0,
      UnresolvedTickets: metrics[date].UnresolvedTickets || 0,
      TotalTransactions: metrics[date].TotalTransactions || 0,
    }));

    // Send response
    return res.status(200).json(formattedResponse);
  } catch (error) {
    console.error("Error fetching super admin metrics:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getSuperAdminMetrics,
};
