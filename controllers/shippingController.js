const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();
const Warehouse = require("../models/wareHouse");
const Shipping = require("../models/Shipping");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Order = require("../models/Order");
const chargeSheet = require("../chargesSheet");
const RemittanceRequest = require("../models/RemittanceRequest");
const FormData = require("form-data");
const {
  getXpressbeesToken,
  getDelhiveryToken,
} = require("../helpers/authHelpers");
const axios = require("axios");

const getCharges = (customerType, deliveryPartnerName, cod, freight) => {
  // Skip validation for Xpressbees
  if (deliveryPartnerName.toLowerCase() === "xpressbees") {
    const total_charges = freight + cod;
    return total_charges;
  }

  const customerCharge = chargeSheet.find(
    (sheet) => sheet.customerType === customerType
  );

  if (!customerCharge) {
    console.error(`Customer type "${customerType}" not found.`);
    return null;
  }

  const partner = customerCharge.deliveryPartners.find(
    (partner) => partner.carrierName === deliveryPartnerName
  );

  if (!partner) {
    console.error(
      `Delivery partner "${deliveryPartnerName}" not found for customer type "${customerType}".`
    );
    return null;
  }

  const total_charges = partner.freight * freight + cod * partner.codPercentage;
  return total_charges;
};

const generateAWB = (partner) => {
  const partnerPrefix =
    {
      xpressbees: "XB",
      delhivery: "DL",
      ecomexpress: "EC",
    }[partner.toLowerCase()] || "XX";

  const randomDigits = Math.floor(100000000000 + Math.random() * 900000000000);
  return `${partnerPrefix}${randomDigits}`.slice(0, 12);
};

const generateShipmentId = () => {
  return `SHIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const calculateShippingCharges = (order) => {
  const baseCharge = 50;
  const weightCharge = order.actualWeight * 10;
  return baseCharge + weightCharge;
};

const generatePartnerId = (partner) => {
  return `${partner.toUpperCase().slice(0, 3)}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
};

const fetchCityStateFromPincode = async (pincode) => {
  try {
    const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = response.data;

    if (data[0].Status === "Success") {
      const { District: city, State: state } = data[0].PostOffice[0];
      return { city, state };
    } else {
      throw new Error(`Invalid pincode: ${pincode}`);
    }
  } catch (error) {
    console.error(`Error fetching city/state for pincode ${pincode}:`, error.message);
    throw new Error("Failed to fetch city and state from pincode.");
  }
};

const createXpressbeesShipment = async (order, pickupWarehouse, shippingCost) => {
  try {
    const token = await getXpressbeesToken();

    if (!token) {
      throw new Error("Failed to fetch Xpressbees token");
    }

    // Map orderType to paymentMethod
    const paymentType = order.orderType.toLowerCase() === "cod" ? "cod" : "prepaid";

    // Fetch city and state from pincode if missing
    if (!pickupWarehouse.city || !pickupWarehouse.state) {
      const { city, state } = await fetchCityStateFromPincode(pickupWarehouse.pincode);
      pickupWarehouse.city = city;
      pickupWarehouse.state = state;
    }

    // Construct payload
    const payload = {
      order_number: order.orderId,
      unique_order_number: "no",
      shipping_charges: shippingCost,
      discount: 0,
      cod_charges: 0,
      payment_type: paymentType,
      order_amount: shippingCost,
      package_weight: order.actualWeight,
      package_length: order.length,
      package_breadth: order.breadth,
      package_height: order.height,
      request_auto_pickup: "yes",
      consignee: {
        name: order.consignee,
        address: order.consigneeAddress1,
        address_2: order.consigneeAddress2 || "",
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        phone: order.mobile,
      },
      pickup: {
        warehouse_name: pickupWarehouse.name || "Default Warehouse",
        name: pickupWarehouse.managerName || "Warehouse Manager",
        address: pickupWarehouse.address || "Default Address",
        city: pickupWarehouse.city,
        state: pickupWarehouse.state,
        pincode: pickupWarehouse.pincode,
        phone: pickupWarehouse.managerMobile || "0000000000",
      },
      order_items: [
        {
          name: order.itemDescription || "Item",
          qty: order.quantity,
          price: order.declaredValue,
          sku: order.orderId,
        },
      ],
      collectable_amount: paymentType === "cod" ? order.collectableValue : 0,
    };

    // Log the payload for debugging
    console.log("Payload sent to Xpressbees API:", JSON.stringify(payload, null, 2));

    // Make API request
    const response = await axios.post(
      "https://shipment.xpressbees.com/api/shipments2",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Log the full response for debugging
    console.log("Full Response from Xpressbees API:", JSON.stringify(response.data, null, 2));

    // Validate the response
    if (!response.data || !response.data.status || !response.data.data) {
      throw new Error("Invalid response from Xpressbees API");
    }

    const responseData = response.data.data;

    // Log the selected courier name for debugging
    console.log("Selected Courier Name from API:", responseData.courier_name);

    return {
      success: true,
      awb: responseData.awb_number,
      shipmentId: responseData.shipment_id,
      labelUrl: responseData.label,
      tracking_url: responseData.tracking_url || null,
      partnerData: responseData,
    };
  } catch (error) {
    // Log the error response for debugging
    console.error("Xpressbees API Error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

const createDelhiveryShipment = async (order, pickupWarehouse, shippingCost) => {
  try {
    const token = await getDelhiveryToken();
    const formData = new FormData();
    
    formData.append("client_name", process.env.DELHIVERY_CLIENT_NAME);
    formData.append("pickup_location", pickupWarehouse.pincode);
    formData.append("shipment", JSON.stringify({
      shipments: [{
        waybill: order.orderId,
        name: order.consignee,
        phone: order.mobile,
        pin: order.pincode,
        payment_mode: "Prepaid",
        order_date: new Date().toISOString(),
        total_amount: order.declaredValue,
        products_desc: order.itemDescription,
        quantity: order.quantity,
        consignee_address: order.consigneeAddress1,
        consignee_city: order.city,
        consignee_state: order.state,
        weight: order.actualWeight,
      }]
    }));

    const response = await axios.post(
      "https://staging-express.delhivery.com/api/cmu/create.json",
      formData,
      {
        headers: {
          Authorization: `Token ${token}`,
          ...formData.getHeaders(),
        },
      }
    );

    return {
      success: true,
      awb: response.data.waybill,
      shipmentId: response.data.shipment_id,
      tracking_url: `https://www.delhivery.com/track/${response.data.waybill}`,
      partnerData: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

const createEcomShipment = async (order, pickupWarehouse, shippingCost) => {
  try {
    const response = await axios.post(
      "https://api.ecomexpress.in/shipment",
      {
        order_number: order.orderId,
        payment_type: order.orderType.toLowerCase() === "cod" ? "cod" : "prepaid",
        package_weight: order.actualWeight,
        package_length: order.length,
        package_breadth: order.breadth,
        package_height: order.height,
        consignee: {
          name: order.consignee,
          address: order.consigneeAddress1,
          address_2: order.consigneeAddress2 || "",
          city: order.city,
          state: order.state,
          pincode: order.pincode,
          phone: order.mobile,
        },
        pickup: {
          warehouse_name: pickupWarehouse.name || "Default Warehouse",
          name: pickupWarehouse.managerName || "Warehouse Manager",
          address: pickupWarehouse.address || "Default Address",
          city: pickupWarehouse.city,
          state: pickupWarehouse.state,
          pincode: pickupWarehouse.pincode,
          phone: pickupWarehouse.managerMobile || "0000000000",
        },
        order_items: [
          {
            name: order.itemDescription || "Item",
            qty: order.quantity,
            price: order.declaredValue,
            sku: order.orderId,
          },
        ],
        collectable_amount: order.orderType.toLowerCase() === "cod" ? order.collectableValue : 0,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ECOM_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      awb: response.data.awb_number,
      shipmentId: response.data.shipment_id,
      tracking_url: response.data.tracking_url || null,
      partnerData: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

const safe = (val, def = "") => (val !== undefined && val !== null ? val : def);

const buildShippingData = (order, pickupWarehouse, rtoWarehouse, shippingCost, carrierResponse, selectedPartner) => ({
  userId: order.userId,
  orderIds: [order._id],
  partnerOrderId: safe(carrierResponse.shipmentId, "N/A"),
  awbNumber: safe(carrierResponse.awb, "N/A"),
  shipmentId: safe(carrierResponse.shipmentId, "N/A"),
  label: safe(carrierResponse.labelUrl, ""),
  trackingUrl: safe(carrierResponse.tracking_url, ""),
  status: "booked",
  priceForCustomer: safe(shippingCost, 0),
  partnerDetails: {
    name: safe(selectedPartner, "N/A"),
    id: safe(carrierResponse.partnerId, "N/A"),
    charges: safe(shippingCost, 0),
  },
  pickupAddress: {
    addressLine1: safe(pickupWarehouse.address, "N/A"),
    pincode: safe(pickupWarehouse.pincode, "000000"),
    mobile: safe(pickupWarehouse.managerMobile, "0000000000"),
    name: safe(pickupWarehouse.managerName, "N/A"),
  },
  returnAddress: {
    addressLine1: safe(rtoWarehouse.address, "N/A"),
    pincode: safe(rtoWarehouse.pincode, "000000"),
    mobile: safe(rtoWarehouse.managerMobile, "0000000000"),
    name: safe(rtoWarehouse.managerName, "N/A"),
  },
  consignee: safe(order.consignee, "N/A"),
  warehouseId: safe(pickupWarehouse._id, "N/A"),
});

const buildTransactionData = ({
  userId,
  shippingCost,
  selectedPartner,
  carrierResponse,
  order,
  newShipping,
  userWallet = 0,
}) => ({
  userId,
  type: ["wallet", "shipping"],
  debitAmount: shippingCost,
  creditAmount: 0,
  amount: shippingCost,
  currency: "INR",
  balance: userWallet, // If you have wallet logic, pass the updated balance
  description: `Shipping charges for order ${order._id}`,
  status: "success",
  transactionMode: "debit",
  transactionId: `TRANS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  courier: selectedPartner,
  awbNumber: carrierResponse.awb || carrierResponse.awbNumber || newShipping.awbNumber,
  shipmentId: carrierResponse.shipmentId || newShipping.shipmentId,
  freightCharges: shippingCost,
  partnerOrderId: carrierResponse.partnerOrderId || newShipping.partnerOrderId,
  label: carrierResponse.labelUrl || newShipping.label,
  trackingUrl: carrierResponse.tracking_url || newShipping.trackingUrl,
  // Add more fields as needed from carrierResponse or newShipping
});

const createForwardShipping = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderIds, pickup, rto, selectedPartner } = req.body;

    // Normalize partner name
    const normalizedPartner = selectedPartner.toLowerCase().includes("xpressbees")
      ? "xpressbees"
      : selectedPartner.toLowerCase().includes("delhivery")
      ? "delhivery"
      : selectedPartner.toLowerCase().includes("ecom")
      ? "ecom"
      : null;

    if (!normalizedPartner) {
      return res.status(400).json({ message: "Invalid shipping partner" });
    }

    const orders = await Order.find({ _id: { $in: orderIds } });
    if (orders.length !== orderIds.length) {
      return res.status(404).json({ message: "Some orders not found" });
    }

    const [pickupWarehouse, rtoWarehouse] = await Promise.all([
      Warehouse.findById(pickup),
      Warehouse.findById(rto),
    ]);

    const processedOrders = [];
    const failedOrders = [];

    for (const order of orders) {
      try {
        const shippingCost = calculateShippingCharges(order);

        let carrierResponse;
        switch (normalizedPartner) {
          case "xpressbees":
            carrierResponse = await createXpressbeesShipment(
              order,
              pickupWarehouse,
              shippingCost
            );
            break;
          case "delhivery":
            carrierResponse = await createDelhiveryShipment(
              order,
              pickupWarehouse,
              shippingCost
            );
            break;
          case "ecom":
            carrierResponse = await createEcomShipment(
              order,
              pickupWarehouse,
              shippingCost
            );
            break;
          default:
            throw new Error("Unsupported carrier");
        }

        if (!carrierResponse.success) {
          throw new Error(`Carrier API failed: ${carrierResponse.error}`);
        }

        // Save the AWB and shipment details to the database
        const shippingData = buildShippingData(order, pickupWarehouse, rtoWarehouse, shippingCost, carrierResponse, selectedPartner);
        const newShipping = new Shipping(shippingData);
        await newShipping.save();

        // If you have wallet logic, fetch the latest balance here
        const user = await User.findById(userId);
        const userWallet = user ? user.wallet : 0;

        const transactionData = buildTransactionData({
          userId,
          shippingCost,
          selectedPartner,
          carrierResponse,
          order,
          newShipping,
          userWallet,
        });
        const transaction = new Transaction(transactionData);
        await transaction.save();

        // Update the order to mark it as shipped
        await Order.findByIdAndUpdate(order._id, {
          $set: { shipped: true, shipping: newShipping._id },
        });

        processedOrders.push(order._id);
      } catch (error) {
        failedOrders.push({
          orderId: order._id,
          error: error.message,
        });
      }
    }

    res.json({
      message: "Bulk shipping processed",
      successCount: processedOrders.length,
      failedCount: failedOrders.length,
      processedOrders,
      failedOrders,
    });
  } catch (error) {
    console.error("Shipping Controller Error:", error.message);
    res.status(500).json({
      message: "Server error during shipping creation",
      error: error.message,
    });
  }
};

const createReverseShipping = async (req, res) => {
  const { orderIds } = req.body; // Check if it's bulk shipping and include orders in the request
  const userId = req.user.id; // User ID from the authentication token

  try {
    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate orders
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid or missing orders for reverse shipping" });
    }

    const results = [];
    for (const newOrder of orderIds) {
      // Get partner name from the order
      const partnerName = newOrder.selectedPartner.name;

      // Dynamically retrieve credentials for the specified partner
      let partnerEmail, partnerPassword;

      switch (partnerName) {
        case "Xpressbees":
          partnerEmail = process.env.XPRESSBEES_EMAIL;
          partnerPassword = process.env.XPRESSBEES_PASSWORD;
          break;
        case "Ecom":
          partnerEmail = process.env.ECOM_EMAIL;
          partnerPassword = process.env.ECOM_PASSWORD;
          break;
        case "Delivery":
          partnerEmail = process.env.DELIVERY_EMAIL;
          partnerPassword = process.env.DELIVERY_PASSWORD;
          break;
        default:
          return res.status(400).json({ error: "Unknown partner" });
      }

      if (!partnerEmail || !partnerPassword) {
        return res.status(500).json({
          error: `Credentials for ${partnerName} are missing in the environment variables.`,
        });
      }

      // Authenticate with the partner's reverse shipping service
      const loginResponse = await fetch(newOrder.selectedPartner.authUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: partnerEmail,
          password: partnerPassword,
        }),
      });

      if (!loginResponse.ok) {
        return res.status(502).json({
          error: "Failed to authenticate with the partner shipping service",
        });
      }

      const tokenData = await loginResponse.json();
      const token = tokenData?.data;

      if (!token) {
        return res.status(502).json({
          error: "Invalid token received from the partner shipping service",
        });
      }

      // Send reverse shipping details to the partner's reverse shipping API
      const reverseShippingResponse = await fetch(
        newOrder.selectedPartner.reverseApiUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            order_number: newOrder.selectedOrder.orderId,
            payment_type: "reverse",
            package_weight: newOrder.selectedOrder.actualWeight,
            package_length: newOrder.selectedOrder.length,
            package_breadth: newOrder.selectedOrder.breadth,
            package_height: newOrder.selectedOrder.height,
            consignee: {
              name: newOrder.selectedOrder.consignee,
              address: newOrder.selectedOrder.consigneeAddress1,
              address_2: newOrder.selectedOrder.consigneeAddress2,
              city: newOrder.selectedOrder.destinationCity,
              state: newOrder.selectedOrder.state,
              pincode: newOrder.selectedOrder.pincode,
              phone:
                newOrder.selectedOrder.mobile ||
                newOrder.selectedOrder.telephone,
            },
            pickup: newOrder.selectedPartner.pickupAddress,
            order_items: [
              {
                name: "product",
                qty: newOrder.selectedOrder.pieces,
                price: newOrder.selectedOrder.declaredValue,
                sku: newOrder.selectedOrder.orderId,
              },
            ],
          }),
        }
      );

      const reverseShippingData = await reverseShippingResponse.json();

      if (!reverseShippingResponse.ok) {
        results.push({
          orderId: newOrder.selectedOrder.orderId,
          success: false,
          error: reverseShippingData,
        });
        continue;
      }

      // Save reverse shipping details to the database
      const newReverseShipping = new Shipping({
        userId,
        orderIds: newOrder.selectedOrder.orderIds,
        partnerOrderId: reverseShippingData.data.orderId,
        awbNumber: reverseShippingData.data.awbNumber,
        shipmentId: reverseShippingData.data.shipmentId,
        label: reverseShippingData.data.label,
        manifest: reverseShippingData.data.manifest,
        status: reverseShippingData.data.status,
        reverse: true, // Flag to indicate reverse shipping
        partnerDetails: {
          name: newOrder.selectedPartner.name,
          id: newOrder.selectedPartner.id,
          charges: newOrder.selectedPartner.totalCharges,
        },
      });

      await newReverseShipping.save();
      results.push({ orderId: newOrder.selectedOrder.orderId, success: true });
    }

    return res.status(200).json({
      message: "Reverse shipping process completed",
      results,
    });
  } catch (error) {
    console.error("Error in createReverseShipping:", error.message);
    return res.status(500).json({
      error: "An error occurred while processing the reverse shipping request",
      details: error.message,
    });
  }
};

const getUserShipments = async (req, res) => {
  const userId = req.user.id;

  try {
    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: "User ID is missing or invalid" });
    }

    // Fetch shipments and populate order details
    const shipments = await Shipping.find({ userId })
      .sort({ updatedAt: -1 })
      .populate({
        path: "orderIds", // Populate order details
        model: "Order",
      });

    // If no shipments found
    if (!shipments || shipments.length === 0) {
      return res
        .status(404)
        .json({ message: "No shipments found for this user" });
    }

    res.status(200).json(shipments);
  } catch (error) {
    console.error("Error in getUserShipments:", error.message);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getShippings = async (req, res) => {
  try {
    const response = await Shipping.find().sort({ updatedAt: -1 });

    // If no shipments found, return a 404 status
    if (!response || response.length === 0) {
      return res.status(404).json({ message: "No shipments found" });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getShippings:", error.message);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Fetch COD remittance orders for the authenticated user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {void}
 */
const fetchCodRemittanceOrders = async (req, res) => {
  try {
    const userId = req.user.id; // Extract userId from the token via `authenticate` middleware

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 orders per page
    const skip = (page - 1) * limit;

    // Optional filters
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    // Base query for COD delivered orders
    const query = {
      orderType: { $in: ["cod", "COD"] }, // Match both lowercase and uppercase
      status: "delivered",
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      query.updatedAt = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.updatedAt = { $gte: startDate };
    } else if (endDate) {
      query.updatedAt = { $lte: endDate };
    }

    // Query: Find orders with COD, delivered status, sorted by updatedAt
    const codOrders = await Order.find(query)
      .sort({ updatedAt: -1 }) // Sort by updatedAt in descending order
      .skip(skip) // Skip records for pagination
      .limit(limit) // Limit records per page
      .populate("userId");
    // .select("orderId consignee collectableValue status updatedAt"); // Select only required fields

    // Count total documents for pagination
    const totalOrders = await Order.countDocuments(query);

    if (!codOrders || codOrders.length === 0) {
      return res.status(200).json({
        message: "No COD delivered orders found.",
        pagination: {
          page,
          limit,
          total: totalOrders,
        },
        data: [],
      });
    }

    // Respond with the filtered orders and pagination details
    res.status(200).json({
      message: "COD delivered orders fetched successfully.",
      data: codOrders,
      pagination: {
        page,
        limit,
        total: totalOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching COD remittance orders:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Function to fetch remittance summary for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void}
 */

const fetchAdminRemittanceSummary = async (req, res) => {
  try {
    // const userId = req.user.id; // Extract userId from the token via `authenticate` middleware

    // Validate userId
    // if (!mongoose.Types.ObjectId.isValid(userId)) {
    //   return res.status(400).json({ error: "Invalid user ID." });
    // }

    // Define orderType filter for both "cod" and "COD"
    const orderTypeFilter = { orderType: { $in: ["cod", "COD"] } };

    // Calculate COD Remittance (total collectable value of all delivered COD orders)
    const codRemittance = await Order.aggregate([
      {
        $match: {
          ...orderTypeFilter,
          status: "delivered",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$collectableValue" },
        },
      },
    ]);

    // Calculate Total Remittance (unremitted collectable value)
    const totalRemittance = await Order.aggregate([
      {
        $match: {
          ...orderTypeFilter,
          status: "delivered",
          remittanceStatus: { $ne: "remitted" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$collectableValue" },
        },
      },
    ]);

    // Calculate Next Expected Remittance (pending remittance requests)
    const nextExpectedRemittance = await RemittanceRequest.aggregate([
      {
        $match: {
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$requestedAmount" },
        },
      },
    ]);

    // Calculate Paid Remittance (approved remittance requests)
    const paidRemittance = await RemittanceRequest.aggregate([
      {
        $match: {
          status: "Approved",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$paidAmount" },
        },
      },
    ]);

    // Prepare response
    const response = {
      codRemittance: codRemittance.length > 0 ? codRemittance[0].total : 0,
      totalRemittance:
        totalRemittance.length > 0 ? totalRemittance[0].total : 0,
      nextExpectedRemittance:
        nextExpectedRemittance.length > 0 ? nextExpectedRemittance[0].total : 0,
      paidRemittance: paidRemittance.length > 0 ? paidRemittance[0].total : 0,
    };

    // Respond with the remittance summary
    res.status(200).json({
      message: "Remittance summary fetched successfully.",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching remittance summary:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

const fetchRemittanceSummary = async (req, res) => {
  try {
    const userId = req.user.id; // Extract userId from the token via `authenticate` middleware

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    // Define orderType filter for both "cod" and "COD"
    const orderTypeFilter = { orderType: { $in: ["cod", "COD"] } };

    // Calculate COD Remittance (total collectable value of all delivered COD orders)
    const codRemittance = await Order.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          ...orderTypeFilter,
          status: "delivered",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$collectableValue" },
        },
      },
    ]);

    // Calculate Total Remittance (unremitted collectable value)
    const totalRemittance = await Order.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          ...orderTypeFilter,
          status: "delivered",
          remittanceStatus: { $ne: "remitted" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$collectableValue" },
        },
      },
    ]);

    // Calculate Next Expected Remittance (pending remittance requests)
    const nextExpectedRemittance = await RemittanceRequest.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$requestedAmount" },
        },
      },
    ]);

    // Calculate Paid Remittance (approved remittance requests)
    const paidRemittance = await RemittanceRequest.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: "Approved",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$paidAmount" },
        },
      },
    ]);

    // Prepare response
    const response = {
      codRemittance: codRemittance.length > 0 ? codRemittance[0].total : 0,
      totalRemittance:
        totalRemittance.length > 0 ? totalRemittance[0].total : 0,
      nextExpectedRemittance:
        nextExpectedRemittance.length > 0 ? nextExpectedRemittance[0].total : 0,
      paidRemittance: paidRemittance.length > 0 ? paidRemittance[0].total : 0,
    };

    // Respond with the remittance summary
    res.status(200).json({
      message: "Remittance summary fetched successfully.",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching remittance summary:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * Function to track shipment by AWB
 * @param {string} courier - The courier name ('xpressbees' or 'ecom')
 * @param {string} awb - The AWB number
 * @returns {object} - The tracking details or an error message
 */
const trackShipment = async (courier, awb) => {
  try {
    if (courier === "xpressbees") {
      // Step 1: Get Bearer Token
      const token = await getXpressbeesToken();

      // Step 2: Use token to fetch tracking details
      const response = await axios.get(
        `https://shipment.xpressbees.com/api/shipments2/track/${awb}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data; // Return the tracking details
    } else if (courier === "ecom") {
      // Ecom Express Tracking API
      const response = await axios.get(
        `https://clbeta.ecomexpress.in/track_me/api/mawbd/`,
        {
          params: {
            username: process.env.ECOM_USERID,
            password: process.env.ECOM_PASSWORD,
            awb: awb,
          },
        }
      );
      return response.data; // Return the tracking details
    } else {
      return { error: "Invalid courier service. Use 'xpressbees' or 'ecom'." };
    }
  } catch (error) {
    console.error(error.message);
    return { error: "Failed to fetch tracking details. Please try again." };
  }
};

/**
 * Function to track shipment by AWB without login
 * @param {string} courier - The courier name ('ecom', 'delhivery', or 'xpressbees')
 * @param {string} awb - The AWB number
 * @returns {object} - The tracking details or an error message
 */
const trackShipmentWithoutLogin = async (req, res) => {
  try {
    const { courier, awb } = req.body;

    // Validate inputs
    if (!courier || !["ecom", "delhivery", "xpressbees"].includes(courier)) {
      return res.status(400).json({
        error:
          "Invalid courier service. Use 'ecom', 'delhivery', or 'xpressbees'.",
      });
    }
    if (!awb || typeof awb !== "string") {
      return res.status(400).json({ error: "Invalid AWB number." });
    }

    let trackingDetails = null;
    let response;

    if (courier === "xpressbees") {
      // ✅ Xpressbees Tracking API
      const token = await getXpressbeesToken();

      response = await axios
        .get(`https://shipment.xpressbees.com/api/shipments2/track/${awb}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        .catch((error) => error.response);

      trackingDetails = response?.data?.data || null;
    } else if (courier === "ecom") {
      // ✅ Ecom Express Tracking API
      response = await axios
        .get(`https://clbeta.ecomexpress.in/track_me/api/mawbd/`, {
          params: {
            username: process.env.ECOM_USERID, // Use environment variables
            password: process.env.ECOM_PASSWORD,
            awb,
          },
        })
        .catch((error) => error.response);

      trackingDetails = response?.data || null;
    } else if (courier === "delhivery") {
      // ✅ Delhivery Tracking API
      response = await axios
        .get("https://track.delhivery.com/api/v1/packages/json/", {
          params: { waybill: awb },
          headers: {
            Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        })
        .catch((error) => error.response);

      trackingDetails = response?.data || null;
    }

    // Handle invalid AWB or missing data
    if (!trackingDetails || trackingDetails.error || response?.status === 404) {
      return res.status(404).json({ error: "AWB not found or invalid." });
    }

    return res.status(200).json({
      success: true,
      courier,
      awb,
      trackingDetails,
    });
  } catch (error) {
    // Handle API-specific errors
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        return res
          .status(401)
          .json({ error: "Unauthorized. Invalid API token." });
      } else if (status === 404) {
        return res.status(404).json({ error: "AWB not found or invalid." });
      } else {
        return res
          .status(status)
          .json({ error: data?.message || "Tracking service error." });
      }
    }

    console.error("Error tracking shipment without login:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch tracking details. Please try again." });
  }
};

/**
 * Function to track shipment by AWB with login
 * @param {string} courier - The courier name ('ecom', 'delhivery', or 'xpressbees')
 * @param {string} awb - The AWB number
 * @returns {object} - The tracking details or an error message
 */
const trackShipmentWithLogin = async (req, res) => {
  try {
    const { courier, awb } = req.body;

    // Validate inputs
    if (!courier || !["ecom", "delhivery", "xpressbees"].includes(courier)) {
      return res.status(400).json({
        error:
          "Invalid courier service. Use 'ecom', 'delhivery', or 'xpressbees'.",
      });
    }
    if (!awb || typeof awb !== "string") {
      return res.status(400).json({ error: "Invalid AWB number." });
    }

    let trackingDetails = null;
    let response;

    if (courier === "xpressbees") {
      // ✅ Xpressbees Tracking API
      const token = await getXpressbeesToken();

      response = await axios
        .get(`https://shipment.xpressbees.com/api/shipments2/track/${awb}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        .catch((error) => error.response);

      trackingDetails = response?.data?.data || null;
    } else if (courier === "ecom") {
      // ✅ Ecom Express Tracking API
      response = await axios
        .get(`https://clbeta.ecomexpress.in/track_me/api/mawbd/`, {
          params: {
            username: process.env.ECOM_USERID, // Use environment variables
            password: process.env.ECOM_PASSWORD,
            awb,
          },
        })
        .catch((error) => error.response);

      trackingDetails = response?.data || null;
    } else if (courier === "delhivery") {
      // ✅ Delhivery Tracking API
      response = await axios
        .get("https://track.delhivery.com/api/v1/packages/json/", {
          params: { waybill: awb },
          headers: {
            Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        })
        .catch((error) => error.response);

      trackingDetails = response?.data || null;
    }

    // Handle invalid AWB or missing data
    if (!trackingDetails || trackingDetails.error || response?.status === 404) {
      return res.status(404).json({ error: "AWB not found or invalid." });
    }

    return res.status(200).json({
      success: true,
      courier,
      awb,
      trackingDetails,
    });
  } catch (error) {
    // Handle API-specific errors
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        return res
          .status(401)
          .json({ error: "Unauthorized. Invalid API token." });
      } else if (status === 404) {
        return res.status(404).json({ error: "AWB not found or invalid." });
      } else {
        return res
          .status(status)
          .json({ error: data?.message || "Tracking service error." });
      }
    }

    console.error("Error tracking shipment without login:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch tracking details. Please try again." });
  }
};

/**
 * Get shipping details by AWB number.
 */
const getShippingDetailsByAWB = async (req, res) => {
  const userId = req.user?.id; // Assuming req.user is set after middleware processes the token
  const { awbNumber } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is missing or invalid" });
    }

    if (!awbNumber) {
      return res.status(400).json({ message: "AWB number is required" });
    }

    const response = await Shipping.findOne({ userId, awbNumber });

    if (!response) {
      return res
        .status(404)
        .json({ message: "Shipping details not found for this AWB number" });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getShippingDetailsByAWB:", error.message);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get shipping details by shipment ID.
 */
const getShippingDetailsByShipmentId = async (req, res) => {
  const userId = req.user?.id; // Assuming req.user is set after middleware processes the token
  const { shipmentId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is missing or invalid" });
    }

    if (!shipmentId) {
      return res.status(400).json({ message: "Shipment ID is required" });
    }

    const response = await Shipping.findOne({ userId, shipmentId });

    if (!response) {
      return res
        .status(404)
        .json({ message: "Shipping details not found for this shipment ID" });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getShippingDetailsByShipmentId:", error.message);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const fetchNDROrders = async (req, res) => {
  try {
    // Extract userId from authenticated request
    const userId = req.user.id;

    // Find orders that are out for delivery but not delivered
    const orders = await Order.find({
      userId,
      status: "Out for Delivery",
      delivered: false,
    });

    if (!orders.length) {
      return res.status(404).json({
        message: "No orders found that are out for delivery but not delivered.",
      });
    }

    return res.status(200).json({
      message: "Orders fetched successfully.",
      data: orders,
    });
  } catch (error) {
    console.error("Error in fetchNDROrders:", error.message);
    return res.status(500).json({
      error: "An error occurred while fetching orders.",
      details: error.message,
    });
  }
};

/**
 * Function to request remittance from superadmin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void}
 */
const requestRemittance = async (req, res) => {
  try {
    const adminId = req.user.id; // Extract adminId from the token via `authenticate` middleware
    const { userId, requestedAmount } = req.body; // userId and requestedAmount from the request body

    // Validate inputs
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }
    if (!requestedAmount || requestedAmount <= 0) {
      return res.status(400).json({ error: "Invalid requested amount." });
    }

    // Calculate Total Remittance (unremitted collectable value for the specific user)
    const totalRemittance = await Order.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId), // Filter by userId
          orderType: "cod",
          status: "delivered",
          remittanceStatus: { $ne: "remitted" }, // Only include orders not yet remitted
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$collectableValue" },
        },
      },
    ]);

    const totalRemittanceAmount =
      totalRemittance.length > 0 ? totalRemittance[0].total : 0;

    // Check if requestedAmount is valid
    if (requestedAmount > totalRemittanceAmount) {
      return res.status(400).json({
        error: "Requested amount cannot exceed total remittance.",
      });
    }

    // Create a new remittance request
    const remittanceRequest = new RemittanceRequest({
      adminId,
      userId,
      requestedAmount,
      status: "Pending", // Default status
    });

    await remittanceRequest.save();

    // Respond with success message
    res.status(201).json({
      message: "Remittance request submitted successfully.",
      data: remittanceRequest,
    });
  } catch (error) {
    console.error("Error requesting remittance:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * Function to approve remittance request by superadmin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void}
 */
const approveRemittance = async (req, res) => {
  try {
    const { requestId } = req.params; // Remittance request ID to approve

    // Validate requestId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: "Invalid request ID." });
    }

    // Find the remittance request
    const remittanceRequest = await RemittanceRequest.findById(requestId);

    if (!remittanceRequest) {
      return res.status(404).json({ error: "Remittance request not found." });
    }

    // Check if the request is already approved
    if (remittanceRequest.status === "Approved") {
      return res.status(400).json({ error: "Request is already approved." });
    }

    // Update the request status to Approved
    remittanceRequest.status = "Approved";
    remittanceRequest.paidAmount = remittanceRequest.requestedAmount; // Set paidAmount
    remittanceRequest.approvalDate = new Date();

    await remittanceRequest.save();

    // Update the remittance status of the corresponding orders for the specific user
    await Order.updateMany(
      {
        userId: remittanceRequest.userId, // Filter by userId
        orderType: "cod",
        status: "delivered",
        remittanceStatus: { $ne: "remitted" }, // Only include orders not yet remitted
      },
      { $set: { remittanceStatus: "remitted" } }
    );

    // Respond with success message
    res.status(200).json({
      message: "Remittance request approved successfully.",
      data: remittanceRequest,
    });
  } catch (error) {
    console.error("Error approving remittance:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

const verifyAWB = async (req, res) => {
  const { awbNumber } = req.body; // Just get the awbNumber from the request body
  const userId = req.user.id; // Get the userId from the authenticated user (middleware)

  try {
    // Look up the shipping record by the awbNumber
    const shipping = await Shipping.findOne({ awbNumber });

    // If no shipping record is found
    if (!shipping) {
      return res.status(200).json({ success: false });
    }

    // Check if the userId in the shipping record matches the provided userId
    if (shipping.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "User does not match the shipping record" });
    }

    // If both are valid, return true
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in verifyAWB:", error.message);
    return res.status(500).json({
      error: "An error occurred while verifying the AWB number",
      details: error.message,
    });
  }
};

/**
 * Function to handle NDR and RTO logic for multiple partners
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void}
 */
const handleNDRAndRTO = async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch all shipments for the user
    const shipments = await Shipping.find({ userId });

    if (!shipments.length) {
      return res.status(404).json({ error: "No shipments found." });
    }

    const processedShipments = [];

    // Loop through each shipment and process it
    for (const shipment of shipments) {
      const { awbNumber, PARTNER_Name } = shipment;

      // Log the shipment data for debugging
      console.log("Processing shipment:", shipment);

      // Check if the partner details are missing or empty
      if (!PARTNER_Name || PARTNER_Name.trim() === "") {
        processedShipments.push({
          awbNumber,
          status: "unknown",
          message: "Partner name is missing or empty in shipment data.",
        });
        continue;
      }

      // Validate AWB number
      if (!awbNumber) {
        processedShipments.push({
          awbNumber,
          status: "unknown",
          message: "AWB number is missing.",
        });
        continue;
      }

      // Normalize the partner name to lowercase for comparison
      const partnerName = PARTNER_Name.toLowerCase();
      let trackingResponse;

      try {
        switch (
          true // Switch on a condition
        ) {
          case partnerName.includes("xpressbees"):
            trackingResponse = await axios.get(
              `https://api.xpressbees.com/track/${awbNumber}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.XPRESSBEES_TOKEN}`,
                },
              }
            );
            break;
          case partnerName.includes("ecom"):
            trackingResponse = await axios.get(
              `https://api.ecomexpress.in/track/${awbNumber}`,
              {
                params: {
                  username: process.env.ECOM_USERNAME,
                  password: process.env.ECOM_PASSWORD,
                },
              }
            );
            break;
          case partnerName.includes("delivery"):
            trackingResponse = await axios.get(
              `https://api.delivery.com/track/${awbNumber}`,
              {
                headers: {
                  Authorization: `Token ${process.env.DELIVERY_TOKEN}`,
                },
              }
            );
            break;
          default:
            processedShipments.push({
              awbNumber,
              status: "unknown",
              message: `Unknown partner: ${partnerName}.`,
            });
            continue;
        }

        const trackingDetails = trackingResponse.data;
        console.log("tracking: ", trackingDetails);
        const { status, attempts } = trackingDetails;

        // Process the shipment based on the status and attempts
        if (status === "delivered") {
          shipment.status = "delivered";
          await shipment.save();
          processedShipments.push({
            awbNumber,
            status: "delivered",
            message: "Shipment delivered successfully.",
          });
        } else if (attempts === 1 && status === "undelivered") {
          shipment.status = "rto";
          await shipment.save();
          processedShipments.push({
            awbNumber,
            status: "rto",
            message: "Shipment moved to RTO after first attempt.",
          });
        } else if (attempts >= 3 && status === "undelivered") {
          shipment.status = "ndr";
          await shipment.save();
          processedShipments.push({
            awbNumber,
            status: "ndr",
            message: "Shipment moved to NDR after 3 attempts.",
          });
        } else {
          processedShipments.push({
            awbNumber,
            status: "in progress",
            message: "Delivery is still in progress.",
          });
        }
      } catch (error) {
        processedShipments.push({
          awbNumber,
          status: "unknown",
          message: `Error fetching tracking details: ${error.message}`,
        });
      }
    }

    return res.status(200).json({
      message: "Processed all shipments.",
      shipments: processedShipments,
    });
  } catch (error) {
    console.error("Error handling NDR and RTO:", error.message);
    return res.status(500).json({
      error: "An error occurred while processing NDR and RTO.",
      details: error.message,
    });
  }
};

/**
 * Fetch all shipments with status "rto".
 */
const fetchRTOShipments = async (req, res) => {
  try {
    const rtoShipments = await Shipping.find({ status: "rto" });

    res.status(200).json({
      success: true,
      count: rtoShipments.length,
      shipments: rtoShipments,
    });
  } catch (error) {
    console.error("Error fetching RTO shipments:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to fetch RTO shipments.",
    });
  }
};

/**
 * Fetch all shipments with status "rtc".
 */
const fetchRTCShipments = async (req, res) => {
  try {
    const rtcShipments = await Shipping.find({ status: "rtc" });

    res.status(200).json({
      success: true,
      count: rtcShipments.length,
      shipments: rtcShipments,
    });
  } catch (error) {
    console.error("Error fetching RTC shipments:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to fetch RTC shipments.",
    });
  }
};

/**
 * Change a shipment's status from "rto" to "rtc".
 */
const updateShipmentStatusToRTC = async (req, res) => {
  try {
    const { shipmentId } = req.body;

    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        error: "Shipment ID is required.",
      });
    }

    const shipment = await Shipping.findById(shipmentId);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: "Shipment not found.",
      });
    }

    if (shipment.status !== "rto") {
      return res.status(400).json({
        success: false,
        error: "Only RTO shipments can be updated to RTC.",
      });
    }

    shipment.status = "rtc";
    await shipment.save();

    res.status(200).json({
      success: true,
      message: "Shipment status updated to RTC successfully.",
      shipment,
    });
  } catch (error) {
    console.error("Error updating shipment status to RTC:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to update shipment status to RTC.",
    });
  }
};

/**
 * Fetch all RTO shipments for a specific user.
 */
const fetchUserRTOShipments = async (req, res) => {
  try {
    const userId = req.user.id; // Get logged-in user's ID

    const rtoShipments = await Shipping.find({ userId, status: "rto" });

    res.status(200).json({
      success: true,
      count: rtoShipments.length,
      shipments: rtoShipments,
    });
  } catch (error) {
    console.error("Error fetching user's RTO shipments:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to fetch RTO shipments.",
    });
  }
};

/**
 * Fetch all RTC shipments for a specific user.
 */
const fetchUserRTCShipments = async (req, res) => {
  try {
    const userId = req.user.id; // Get logged-in user's ID

    const rtcShipments = await Shipping.find({ userId, status: "rtc" });

    res.status(200).json({
      success: true,
      count: rtcShipments.length,
      shipments: rtcShipments,
    });
  } catch (error) {
    console.error("Error fetching user's RTC shipments:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to fetch RTC shipments.",
    });
  }
};

const cancelShipping = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingId } = req.body;

    // Find the shipping entry
    const shipping = await Shipping.findById(shippingId);
    if (!shipping) {
      return res.status(404).json({ message: "Shipping record not found" });
    }

    // Ensure the shipping is in "pending" status
    if (shipping.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending shipments can be canceled" });
    }

    // Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Refund amount to wallet
    const refundAmount = shipping.partnerDetails.charges;
    user.wallet += refundAmount;
    await user.save();

    // Create refund transaction
    const transaction = await Transaction.create({
      userId: user._id,
      type: ["wallet", "refund"], // Types of transaction
      debitAmount: 0, // No debit because it's a refund
      creditAmount: refundAmount, // Refund amount
      currency: "INR",
      balance: user.wallet, // Updated wallet balance after refund
      transactionMode: "wallet", // Mode is wallet
      description: `Shipping cancellation refund for orders: ${shipping.orderIds.join(
        ", "
      )}`,
      status: "success",
      transactionId: generateTransactionId(), // Your transaction id generator
      shippingDetails: [
        {
          awbNumber: shipping.awbNumber || "",
          shipmentId: shipping.shipmentId || "",
        },
      ],
    });

    // Update the order status and remove shipping reference
    await Order.updateMany(
      { _id: { $in: shipping.orderIds } },
      { $set: { shipped: false }, $unset: { shipping: 1 } }
    );

    // Delete the shipping record
    await Shipping.findByIdAndDelete(shippingId);

    res.json({
      message: "Shipping canceled successfully, amount refunded",
      refundedAmount: refundAmount,
      transactionId: transaction._id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during shipping cancellation",
      error: error.message,
    });
  }
};

module.exports = {
  createForwardShipping,
  createReverseShipping,
  getUserShipments,
  getShippings,
  fetchCodRemittanceOrders,
  fetchRemittanceSummary,
  fetchAdminRemittanceSummary,
  trackShipment,
  trackShipmentWithoutLogin,
  trackShipmentWithLogin,
  getShippingDetailsByAWB,
  getShippingDetailsByShipmentId,
  fetchNDROrders,
  requestRemittance,
  approveRemittance,
  verifyAWB,
  handleNDRAndRTO,
  fetchRTOShipments,
  fetchRTCShipments,
  updateShipmentStatusToRTC,
  fetchUserRTOShipments,
  fetchUserRTCShipments,
  cancelShipping,
};
