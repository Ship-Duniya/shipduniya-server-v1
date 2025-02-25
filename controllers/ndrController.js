const NDROrder = require("../models/NDR");
const Order = require("../models/Order");
const axios = require("axios");

/**
 * Fetch all NDR orders and categorize them by courier.
 */
// const fetchNDROrdersForAdmin = async (req, res) => {
//   try {
//     const orders = await NDROrder.find();
//     const groupedOrders = groupOrdersByCourier(orders);

//     return res.status(200).json({
//       success: true,
//       groupedOrders,
//     });
//   } catch (error) {
//     console.error("Error fetching NDR orders for admin:", error);
//     return res.status(500).json({ error: "Failed to fetch NDR orders." });
//   }
// };

//above one is correct - ************************************************************
const fetchNDROrdersForAdmin = async (req, res) => {
  try {
    // Hardcoded orders for each courier
    const hardcodedOrders = {
      xpressbees: [
        {
          orderId: "ORDER-1739605146868", // Replace with real order ID
          awb: "XB123456789",
          shipmentId: "SHIPMENT-123",
          courier: "xpressbees",
          status: "pending",
          failureReason: "Customer Unavailable",
          reasons: "Delivery attempt failed due to customer unavailability.",
        },
      ],
      ecom: [
        {
          orderId: "ORDER-1739602142405", // Replace with real order ID
          awb: "EC987654321",
          shipmentId: "SHIPMENT-456",
          courier: "ecom",
          status: "delivered",
          failureReason: null,
          reasons: "Delivered successfully.",
        },
      ],
      delhivery: [
        {
          orderId: "ORDER-1739181654857", // Replace with real order ID
          awb: "DL123789456",
          shipmentId: "SHIPMENT-789",
          courier: "delhivery",
          status: "returned",
          failureReason: "Returned to Sender (RTO)",
          reasons: "Return due to address issue.",
        },
      ],
    };

    // Fetch real orders from the database
    const realOrders = await Order.find({
      orderId: {
        $in: [
          "ORDER-1739605146868",
          "ORDER-1739602142405",
          "ORDER-1739181654857",
        ],
      },
    }).populate("userId"); // Populate the userId field to get user details

    // Map the real orders to the hardcoded orders structure
    const groupedOrders = {
      xpressbees: hardcodedOrders.xpressbees.map((order) => {
        const realOrder = realOrders.find((ro) => ro.orderId === order.orderId);
        return {
          ...order,
          ...realOrder.toObject(), // Merge hardcoded and real order details
        };
      }),
      ecom: hardcodedOrders.ecom.map((order) => {
        const realOrder = realOrders.find((ro) => ro.orderId === order.orderId);
        return {
          ...order,
          ...realOrder.toObject(), // Merge hardcoded and real order details
        };
      }),
      delhivery: hardcodedOrders.delhivery.map((order) => {
        const realOrder = realOrders.find((ro) => ro.orderId === order.orderId);
        return {
          ...order,
          ...realOrder.toObject(), // Merge hardcoded and real order details
        };
      }),
    };

    return res.status(200).json({
      success: true,
      groupedOrders,
    });
  } catch (error) {
    console.error("Error fetching NDR orders for admin:", error);
    return res.status(500).json({ error: "Failed to fetch NDR orders." });
  }
};

/**
 * Fetch NDR orders for a specific user and categorize them by courier.
 */
const fetchNDROrdersForUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await NDROrder.find({ createdBy: userId });
    const groupedOrders = groupOrdersByCourier(orders);

    return res.status(200).json({
      success: true,
      groupedOrders,
    });
  } catch (error) {
    console.error("Error fetching NDR orders for user:", error);
    return res.status(500).json({ error: "Failed to fetch NDR orders." });
  }
};

/**
 * Handle NDR action based on the carrier.
 */
const handleNDRAction = async (req, res) => {
  const { awb, action, action_data, carrier, reasons } = req.body;

  if (!awb || !action || !carrier) {
    return res
      .status(400)
      .json({ message: "AWB, action, and carrier are mandatory." });
  }

  try {
    const handlers = {
      xpressbees: handleXpressBees,
      ecomexpress: handleEcomExpress,
      delhivery: handleDelhivery,
    };

    if (!handlers[carrier.toLowerCase()]) {
      return res
        .status(400)
        .json({ message: `Unsupported carrier: ${carrier}` });
    }

    const response = await handlers[carrier.toLowerCase()](
      awb,
      action,
      action_data
    );

    // Update reasons in the database
    const updatedOrder = await NDROrder.findOneAndUpdate(
      { awb },
      { reasons },
      { new: true }
    );

    return res.json({
      message: "NDR action processed successfully",
      awb,
      carrier,
      status: "success",
      data: response.data,
      reasons: updatedOrder.reasons, // Include reasons in response
    });
  } catch (error) {
    console.error("Error processing NDR action:", error);
    return res.status(500).json({
      message: "Failed to process NDR action",
      awb,
      carrier,
      status: "error",
      error: error.message,
    });
  }
};

/**
 * Handle XpressBees NDR actions.
 */
const handleXpressBees = async (awb, action, action_data) => {
  const validActions = ["re-attempt", "change_address", "change_phone"];

  if (!validActions.includes(action)) {
    throw new Error(`Invalid action for XpressBees: ${action}`);
  }

  const payload = [
    {
      awb,
      action,
      action_data: validateXpressBeesActionData(action, action_data),
    },
  ];

  const response = await axios.post(
    "https://shipment.xpressbees.com/api/ndr/create",
    payload,
    {
      headers: {
        Authorization: `Bearer ${process.env.XPRESSBEES_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  return parseXpressBeesResponse(response, awb);
};

/**
 * Handle EcomExpress NDR actions.
 */
const handleEcomExpress = async (awb, action, action_data) => {
  const actionMap = {
    "re-attempt": "RAD",
    cancel: "RTO",
  };

  const instruction = actionMap[action];
  if (!instruction) {
    throw new Error(`Invalid action for EcomExpress: ${action}`);
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
    { headers: { "Content-Type": "application/json" } }
  );

  return parseDelhiveryResponse(response, awb);
};

/**
 * Group orders by courier.
 */
const groupOrdersByCourier = (orders) => {
  return orders.reduce(
    (acc, order) => {
      acc[order.courier]
        ? acc[order.courier].push(order)
        : (acc[order.courier] = [order]);
      return acc;
    },
    { xpressbees: [], ecom: [], delhivery: [] }
  );
};

/**
 * Validate action data for XpressBees.
 */
const validateXpressBeesActionData = (action, data) => {
  const validations = {
    "re-attempt": () => {
      if (!data.re_attempt_date) throw new Error("Missing re_attempt_date");
      return { re_attempt_date: data.re_attempt_date };
    },
    change_address: () => {
      if (!data.name || !data.address_1)
        throw new Error("Missing address fields");
      return {
        name: data.name,
        address_1: data.address_1,
        address_2: data.address_2 || "",
      };
    },
    change_phone: () => {
      if (!data.phone) throw new Error("Missing phone number");
      return { phone: data.phone };
    },
  };

  return validations[action] ? validations[action]() : {};
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
