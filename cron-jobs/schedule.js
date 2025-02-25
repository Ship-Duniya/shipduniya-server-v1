const cron = require("node-cron");
const axios = require("axios");
const User = require("../models/User");
const Order = require("../models/Order");

// Helper to fetch tracking details based on the shipping partner
const fetchTrackingStatus = async (partner, awbNumber) => {
  if (!partner || !awbNumber) {
    console.error("Missing partner or AWB number for tracking.");
    return null;
  }

  try {
    let response;
    switch (partner.toLowerCase()) {
      case "xpressbees":
        response = await axios.get(
          `https://shipment.xpressbees.com/api/shipments2/track/${awbNumber}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.EXPRESSBEES_TOKEN}`,
            },
          }
        );
        return response.data?.data?.status?.toLowerCase();
      case "delhivery":
        response = await axios.get(
          `https://track.delhivery.com/api/v1/track/${awbNumber}`,
          {
            headers: { Authorization: `Bearer ${process.env.DELHIVERY_TOKEN}` },
          }
        );
        return response.data?.status?.toLowerCase();
      case "ekart":
        response = await axios.get(
          `https://api.ekartlogistics.com/v2/shipments/${awbNumber}`,
          {
            headers: { Authorization: `Bearer ${process.env.EKART_TOKEN}` },
          }
        );
        return response.data?.shipment_status?.toLowerCase();
      default:
        console.error(`Unsupported shipping partner: ${partner}`);
        return null;
    }
  } catch (error) {
    console.error(
      `Error fetching tracking status for AWB ${awbNumber} from ${partner}:`,
      error.message
    );
    return null;
  }
};

// Function to fetch and calculate metrics for all orders of a user
const getUserOrderMetrics = async (userId) => {
  try {
    const orders = await Order.find({ userId });

    const metrics = {
      totalParcels: 0,
      totalDelivered: 0,
      totalRTO: 0,
      totalPendingPickup: 0,
      totalInTransit: 0,
      totalLost: 0,
    };

    const orderStatuses = await Promise.all(
      orders.map((order) =>
        order.partner && order.awbNumber
          ? fetchTrackingStatus(order.partner, order.awbNumber)
          : Promise.resolve(null)
      )
    );

    orderStatuses.forEach((status) => {
      if (status) {
        metrics.totalParcels += 1;
        switch (status) {
          case "delivered":
            metrics.totalDelivered += 1;
            break;
          case "rto":
            metrics.totalRTO += 1;
            break;
          case "pending pickup":
            metrics.totalPendingPickup += 1;
            break;
          case "in transit":
            metrics.totalInTransit += 1;
            break;
          case "lost":
            metrics.totalLost += 1;
            break;
        }
      }
    });

    return metrics;
  } catch (error) {
    console.error(
      `Error calculating metrics for user ${userId}:`,
      error.message
    );
    return null;
  }
};

// Function to update metrics for all users
const updateMetricsForAllUsers = async () => {
  try {
    const users = await User.find();
    console.log(`Found ${users.length} users to update metrics.`);

    for (const user of users) {
      const metrics = await getUserOrderMetrics(user._id);
      if (metrics) {
        await User.findByIdAndUpdate(user._id, { metrics });
        console.log(`Metrics updated for user ${user._id}`);
      } else {
        console.warn(`No metrics calculated for user ${user._id}`);
      }
    }

    console.log("All user metrics updated successfully!");
  } catch (error) {
    console.error("Error updating metrics for all users:", error.message);
  }
};

// Export the functions for external usage (if needed)
module.exports = {
  fetchTrackingStatus,
  getUserOrderMetrics,
  updateMetricsForAllUsers,
};
