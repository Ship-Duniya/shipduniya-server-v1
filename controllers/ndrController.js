const NDROrder = require("../models/NDR");
const Order = require("../models/Order");
const Shipping = require("../models/Shipping");
const { getXpressbeesToken } = require("../helpers/authHelpers");
const axios = require("axios");

/**
 * Fetch all NDR orders and categorize them by courier.
 */
const fetchNDROrdersForAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Pagination support
    const skip = (page - 1) * limit;

    // Fetch NDR orders with shipping details
    const ndrOrders = await NDROrder.find({ status: { $ne: "delivered" } })
      .populate({
        path: "shippingId",
        populate: { path: "userId", select: "name address phone" }, // Fetch user details
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Group by user
    const groupedOrders = {};
    ndrOrders.forEach((ndrOrder) => {
      const shipping = ndrOrder.shippingId;
      if (!shipping || !shipping.userId) return; // Skip if no user details

      const user = shipping.userId;
      if (!groupedOrders[user._id]) {
        groupedOrders[user._id] = {
          user: {
            _id: user._id,
            name: user.name,
            address: user.address,
            phone: user.phone,
          },
          ndrOrders: [],
        };
      }
      groupedOrders[user._id].ndrOrders.push(ndrOrder);
    });

    return res.status(200).json({
      success: true,
      users: Object.values(groupedOrders),
      totalUsers: Object.keys(groupedOrders).length,
      currentPage: Number(page),
      totalPages: Math.ceil(ndrOrders.length / limit),
    });
  } catch (error) {
    console.error("Error fetching NDR orders for admin:", error);
    return res.status(500).json({ error: "Failed to fetch NDR orders." });
  }
};

//above one is correct - ************************************************************
// const fetchNDROrdersForAdmin = async (req, res) => {
//   try {
//     // Hardcoded orders for each courier
//     const hardcodedOrders = {
//       xpressbees: [
//         {
//           orderId: "ORDER-1739605146868", // Replace with real order ID
//           awb: "XB123456789",
//           shipmentId: "SHIPMENT-123",
//           courier: "xpressbees",
//           status: "pending",
//           failureReason: "Customer Unavailable",
//           reasons: "Delivery attempt failed due to customer unavailability.",
//         },
//       ],
//       ecom: [
//         {
//           orderId: "ORDER-1739602142405", // Replace with real order ID
//           awb: "EC987654321",
//           shipmentId: "SHIPMENT-456",
//           courier: "ecom",
//           status: "delivered",
//           failureReason: null,
//           reasons: "Delivered successfully.",
//         },
//       ],
//       delhivery: [
//         {
//           orderId: "ORDER-1739181654857", // Replace with real order ID
//           awb: "DL123789456",
//           shipmentId: "SHIPMENT-789",
//           courier: "delhivery",
//           status: "returned",
//           failureReason: "Returned to Sender (RTO)",
//           reasons: "Return due to address issue.",
//         },
//       ],
//     };

//     // Fetch real orders from the database
//     const realOrders = await Order.find({
//       orderId: {
//         $in: [
//           "ORDER-1739605146868",
//           "ORDER-1739602142405",
//           "ORDER-1739181654857",
//         ],
//       },
//     }).populate("userId"); // Populate the userId field to get user details

//     // Map the real orders to the hardcoded orders structure
//     const groupedOrders = {
//       xpressbees: hardcodedOrders.xpressbees.map((order) => {
//         const realOrder = realOrders.find((ro) => ro.orderId === order.orderId);
//         return {
//           ...order,
//           ...realOrder.toObject(), // Merge hardcoded and real order details
//         };
//       }),
//       ecom: hardcodedOrders.ecom.map((order) => {
//         const realOrder = realOrders.find((ro) => ro.orderId === order.orderId);
//         return {
//           ...order,
//           ...realOrder.toObject(), // Merge hardcoded and real order details
//         };
//       }),
//       delhivery: hardcodedOrders.delhivery.map((order) => {
//         const realOrder = realOrders.find((ro) => ro.orderId === order.orderId);
//         return {
//           ...order,
//           ...realOrder.toObject(), // Merge hardcoded and real order details
//         };
//       }),
//     };

//     return res.status(200).json({
//       success: true,
//       groupedOrders,
//     });
//   } catch (error) {
//     console.error("Error fetching NDR orders for admin:", error);
//     return res.status(500).json({ error: "Failed to fetch NDR orders." });
//   }
// };

/**
 * Fetch NDR orders for a specific user and categorize them by courier.
 */
const fetchNDROrdersForUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query; // Pagination support
    const skip = (page - 1) * limit;

    // Fetch NDR orders for the user
    const ndrOrders = await NDROrder.find()
      .populate({
        path: "shippingId",
        match: { userId }, // Fetch only orders belonging to this user
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Filter out orders where shippingId is null (not matching user)
    const filteredOrders = ndrOrders.filter((order) => order.shippingId);

    // Fetch full order details for each NDR order
    const enrichedOrders = await Promise.all(
      filteredOrders.map(async (order) => {
        const fullOrderDetails = await Order.findOne({
          orderId: order.shippingId.orderId,
        });
        return { ...order.toObject(), fullOrderDetails };
      })
    );

    return res.status(200).json({
      success: true,
      data: enrichedOrders,
      totalOrders: enrichedOrders.length,
      currentPage: Number(page),
      totalPages: Math.ceil(enrichedOrders.length / limit),
    });
  } catch (error) {
    console.error("Error fetching NDR orders for user:", error);
    return res.status(500).json({ error: "Failed to fetch NDR orders." });
  }
};

const handleNDRAction = async (req, res) => {
  const { ndrId, action, reasons, action_data } = req.body;

  if (!ndrId || !action) {
    return res.status(400).json({ message: "NDR ID and action are mandatory." });
  }

  if (action === "Re-Attempt" && (!action_data || !action_data.re_attempt_date)) {
    return res.status(400).json({ message: "Missing re_attempt_date for Re-Attempt action." });
  }

  try {
    const ndrOrder = await NDROrder.findById(ndrId);
    if (!ndrOrder) {
      return res.status(404).json({ message: "NDR order not found." });
    }

    const { awb, courier } = ndrOrder;

    const normalizedCarrier = () => {
      const lowerCourier = courier.toLowerCase();
      if (/xpressbees/.test(lowerCourier)) return "xpressbees";
      if (/ecom/.test(lowerCourier)) return "ecomexpress";
      if (/delhivery/.test(lowerCourier)) return "delhivery";
      return null;
    };

    const carrier = normalizedCarrier(); 

    if (!carrier) {
      return res.status(400).json({ message: `Unsupported carrier: ${courier}` });
    }

    const handlers = {
      xpressbees: handleXpressBees,
      ecomexpress: handleEcomExpress,
      delhivery: handleDelhivery,
    };

    if (!handlers[carrier]) {
      return res.status(400).json({ message: `No handler found for carrier: ${carrier}` });
    }

    const response = await handlers[carrier](awb, action, action_data || {});

    const updatedOrder = await NDROrder.findByIdAndUpdate(
      ndrId,
      {
        reasons,
        action_data: action_data || null,
        status: "processed",
        processed_at: new Date(),
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "NDR action processed successfully",
      ndrId,
      awb,
      carrier,
      status: "success",
      data: response?.data,
      reasons: updatedOrder?.reasons || null,
      action_data: updatedOrder?.action_data || null,
    });
  } catch (error) {
    console.error("Error processing NDR action:", error);
    return res.status(500).json({
      message: "Failed to process NDR action",
      ndrId,
      status: "error",
      error: error.message,
      ...(error.response?.data && { api_error: error.response.data }),
    });
  }
};

/**
 * Handle XpressBees NDR actions.
 */
// Improved XpressBees handler with better validation
const handleXpressBees = async (awb, action, action_data) => {
  const validActions = ["re-attempt", "change_address", "change_phone"];

  if (!validActions.includes(action)) {
    throw new Error(
      `Invalid action for XpressBees: ${action}. Valid actions: ${validActions.join(
        ", "
      )}`
    );
  }

  // Validate action_data structure
  const validatedData = validateXpressBeesActionData(action, action_data);

  const payload = [
    {
      awb,
      action,
      action_data: {
        ...validatedData,
        // Add default values where appropriate
        ...(action === "change_address" && {
          address_2: validatedData.address_2 || "",
          city: validatedData.city || "",
          state: validatedData.state || "",
          pincode: validatedData.pincode || "",
        }),
      },
    },
  ];

  const token = await getXpressbeesToken(); // Ensure token handling is implemented

  const response = await axios.post(
    "https://shipment.xpressbees.com/api/ndr/create",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000, // Added timeout
    }
  );

  return parseXpressBeesResponse(response, awb);
};

/**
 * Handle EcomExpress NDR actions.
 */
const handleEcomExpress = async (awb, action, action_data) => {
  try {
    const actionMap = { "re-attempt": "RAD", cancel: "RTO" };
    const instruction = actionMap[action.toLowerCase()];

    if (!instruction) {
      throw new Error(`Invalid action for EcomExpress: ${action}`);
    }

    if (!process.env.ECOM_USERNAME || !process.env.ECOM_PASSWORD) {
      throw new Error(
        "EcomExpress credentials are missing in environment variables."
      );
    }

    const payload = {
      username: process.env.ECOM_USERNAME,
      password: process.env.ECOM_PASSWORD,
      json_input: JSON.stringify([
        {
          awb,
          instruction,
          comments: action_data.comments || "NDR resolution request",
          ...(instruction === "RAD"
            ? {
                scheduled_delivery_date:
                  action_data.scheduled_delivery_date || "",
                scheduled_delivery_slot:
                  action_data.scheduled_delivery_slot || "",
              }
            : {}),
          ...(action_data.mobile && { mobile: action_data.mobile }),
          ...parseAddressFields(action_data),
        },
      ]),
    };

    const response = await axios.post(
      "https://clbeta.ecomexpress.in/apiv2/ndr_resolutions/",
      new URLSearchParams(payload),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return parseEcomResponse(response, awb);
  } catch (error) {
    console.error(`EcomExpress API error: ${error.message}`);
    throw error; // Rethrow for proper handling in caller function
  }
};

/**
 * Handle Delhivery NDR actions.
 */
const handleDelhivery = async (awb, action, action_data) => {
  const validActions = ["RE-ATTEMPT", "PICKUP_RESCHEDULE"];

  if (!validActions.includes(action.toUpperCase())) {
    throw new Error(`Invalid action for Delhivery: ${action}`);
  }

  const payload = { waybill: awb, act: action.toUpperCase() };

  const response = await axios.post(
    "https://track.delhivery.com/api/p/update",
    payload,
    {
      headers: {
        Authorization: `Bearer ${process.env.DELHIVERY_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  return parseDelhiveryResponse(response, awb);
};

/**
 * Group orders by courier.
 */
const groupOrdersByCourier = (orders) => {
  return orders.reduce((acc, order) => {
    const courier = order.courier?.toLowerCase().trim();
    if (!courier) return acc;

    if (!acc[courier]) acc[courier] = [];
    acc[courier].push(order);

    return acc;
  }, {});
};

/**
 * Validate action data for XpressBees.
 */
// Enhanced validation
const validateXpressBeesActionData = (action, data) => {
  const validations = {
    "re-attempt": () => {
      if (!data?.re_attempt_date) throw new Error("Missing re_attempt_date");
      if (!isValidDate(data.re_attempt_date))
        throw new Error("Invalid date format. Use YYYY-MM-DD");
      return { re_attempt_date: data.re_attempt_date };
    },
    change_address: () => {
      if (!data?.name?.trim()) throw new Error("Missing recipient name");
      if (!data?.address_1?.trim()) throw new Error("Missing primary address");
      return {
        name: data.name.trim(),
        address_1: data.address_1.trim(),
        address_2: data.address_2?.trim() || "",
        city: data.city?.trim() || "",
        state: data.state?.trim() || "",
        pincode: data.pincode?.toString().trim() || "",
      };
    },
    change_phone: () => {
      if (!data?.phone) throw new Error("Missing phone number");
      if (!/^\d{10}$/.test(data.phone))
        throw new Error("Invalid phone number format");
      return { phone: data.phone.toString().trim() };
    },
  };

  return validations[action]();
};

// Helper function
const isValidDate = (dateString) => {
  return (
    !isNaN(Date.parse(dateString)) &&
    dateString === new Date(dateString).toISOString().split("T")[0]
  );
};

/**
 * Parse address fields.
 */
const parseAddressFields = (data) => ({
  ...(data.CA1 && { CA1: data.CA1 }),
  ...(data.CA2 && { CA2: data.CA2 }),
  ...(data.CA3 && { CA3: data.CA3 }),
  ...(data.CA4 && { CA4: data.CA4 }),
  ...(data.pincode && { pincode: data.pincode }),
  ...(data.cod_amount && { cod_amount: data.cod_amount }),
});

/**
 * Response parsers.
 */
const parseXpressBeesResponse = (response, awb) => {
  const result = response.data.find((item) => item.awb === awb);
  if (!result || !result.status)
    throw new Error(result?.message || "Failed to process NDR with XpressBees");
  return { message: result.message, data: result };
};

const parseEcomResponse = (response, awb) => {
  const result = response.data.find((item) => item.awb === awb);
  if (!result || !result.status)
    throw new Error("Failed to process NDR with EcomExpress");
  return { message: "NDR action processed successfully", data: result };
};

const parseDelhiveryResponse = (response, awb) => {
  if (!response.data || !response.data.request_id)
    throw new Error("Failed to process NDR with Delhivery");
  return {
    message: "NDR action submitted",
    data: {
      request_id: response.data.request_id,
      status_check_url: `https://track.delhivery.com/api/cmu/get_bulk_upl/${response.data.request_id}?verbose=true`,
    },
  };
};

module.exports = {
  fetchNDROrdersForAdmin,
  fetchNDROrdersForUser,
  handleNDRAction,
};
