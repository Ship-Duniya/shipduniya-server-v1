const cron = require("node-cron");
const User = require("../models/User");
const { updateUserMetrics } = require("./schedule");
const axios = require("axios");
const { getXpressbeesToken } = require("../helpers/authHelpers");
const NDROrder = require("../models/NDR");

// Schedule the job to run every 3 hours
cron.schedule("0 */3 * * *", async () => {
  console.log("Starting scheduled job: updateUserMetrics...");
  try {
    // Fetch all users from the database
    const users = await User.find();
    console.log(`Found ${users.length} users to update metrics.`);

    // Process metrics update for each user
    for (const user of users) {
      try {
        await updateUserMetrics(user);
        console.log(`Successfully updated metrics for user ${user._id}`);
      } catch (userError) {
        console.error(
          `Failed to update metrics for user ${user._id}: ${userError.message}`
        );
      }
    }

    console.log("Scheduled job: updateUserMetrics completed successfully.");
  } catch (error) {
    console.error(`Error fetching users or updating metrics: ${error.message}`);
  }
});

cron.schedule("0 * * * *", async () => {
  try {
    const ndrOrders = await NDROrder.find({ status: { $ne: "delivered" } });

    for (const order of ndrOrders) {
      const { courier, awb } = order;
      let trackingDetails = null;
      let response;

      if (courier === "xpressbees") {
        const token = await getXpressbeesToken();
        response = await axios
          .get(`https://shipment.xpressbees.com/api/shipments2/track/${awb}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch((error) => error.response);
        trackingDetails = response?.data?.data || null;
      } else if (courier === "ecom") {
        response = await axios
          .get("https://clbeta.ecomexpress.in/track_me/api/mawbd/", {
            params: {
              username: process.env.ECOM_USERID,
              password: process.env.ECOM_PASSWORD,
              awb,
            },
          })
          .catch((error) => error.response);
        trackingDetails = response?.data || null;
      } else if (courier === "delhivery") {
        response = await axios
          .get("https://track.delhivery.com/api/v1/packages/json/", {
            params: { waybill: awb },
            headers: {
              Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
            },
          })
          .catch((error) => error.response);
        trackingDetails = response?.data || null;
      }

      // Process tracking details and update NDR order
      if (trackingDetails) {
        let status = "actionRequired";
        let failureReason = null;

        if (trackingDetails.status === "delivered") {
          status = "delivered";
        } else if (trackingDetails.status === "failed") {
          status = "actionRequested";
          failureReason = trackingDetails.failure_reason || "Delivery Failed";
        } else if (trackingDetails.status === "returned") {
          status = "rto";
          failureReason = "Returned to Sender (RTO)";
        }

        await NDROrder.updateOne(
          { _id: order._id },
          { $set: { status, failureReason, updatedAt: new Date() } }
        );
      }
    }
  } catch (error) {
    console.error("Error fetching and updating NDR orders:", error);
  }
});
