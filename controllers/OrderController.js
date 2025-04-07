const Order = require("../models/Order");
const User = require("../models/User");
const FormData = require("form-data");
const ExcelJS = require("exceljs");
const crypto = require("crypto");

const createForwardOrder = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Helper function to validate a single order
    const validateOrder = (order, isBulk = false) => {
      const errors = [];

      if (!order.consignee) errors.push("Consignee is required.");
      if (!order.consigneeAddress1)
        errors.push("Consignee Address 1 is required.");
      if (!order.city) errors.push("City is required.");
      if (!order.state) errors.push("State is required.");
      if (!order.mobile) errors.push("Mobile number is required.");

      if (!/^\d{6}$/.test(order.pincode))
        errors.push("Invalid pincode. Must be a 6-digit number.");
      if (!/^\d{10}$/.test(order.mobile))
        errors.push("Invalid mobile number. Must be a 10-digit number.");
      if (order.declaredValue <= 0)
        errors.push("Declared value must be greater than 0.");
      if (order.height <= 0 || order.length <= 0 || order.breadth <= 0)
        errors.push("Dimensions must be greater than 0.");
      if (order.actualWeight <= 0)
        errors.push("Actual weight must be greater than 0.");

      return errors;
    };

    let ordersToCreate = [];

    if (req.file) {
      // BULK UPLOAD FLOW (file uploaded)

      const filePath = req.file.path; // or req.file.location (if cloud)

      // TODO: Parse the file here (CSV/Excel)
      // Example: using 'csvtojson' or 'xlsx' libraries
      const parsedOrders = []; // parsed orders from file

      // Validate each order
      for (const order of parsedOrders) {
        const errors = validateOrder(order, true);
        if (errors.length > 0) {
          return res
            .status(400)
            .json({
              error: `Validation failed for one of the orders: ${errors.join(
                ", "
              )}`,
            });
        }
      }

      ordersToCreate = parsedOrders.map((order) => ({
        user: userId,
        orderType: order.orderType,
        consignee: order.consignee,
        consigneeAddress1: order.consigneeAddress1,
        consigneeAddress2: order.consigneeAddress2 || "",
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        mobile: order.mobile,
        telephone: order.telephone || "",
        actualWeight: order.actualWeight,
        declaredValue: order.declaredValue,
        collectableValue: order.collectableValue || 0,
        itemDescription: order.itemDescription || "",
        length: order.length,
        breadth: order.breadth,
        height: order.height,
        volumetricWeight: order.volumetricWeight || 0,
        dgShipment: order.dgShipment || false,
        invoiceNumber: order.invoiceNumber,
        invoiceUrl: "", // file bulk upload won't have invoice URL
        quantity: order.quantity || 1,
      }));
    } else {
      // SINGLE ORDER FLOW (req.body.order)

      const { order } = req.body;

      if (!order) {
        return res.status(400).json({ error: "Order data is missing" });
      }

      const errors = validateOrder(order, false);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(", ") });
      }

      let invoiceUrl = "";
      if (req.file) {
        const file = req.file;
        invoiceUrl = file.path || file.location; // cloud/local
      }

      ordersToCreate.push({
        user: userId,
        orderType: order.orderType,
        consignee: order.consignee,
        consigneeAddress1: order.consigneeAddress1,
        consigneeAddress2: order.consigneeAddress2 || "",
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        mobile: order.mobile,
        telephone: order.telephone || "",
        actualWeight: order.actualWeight,
        declaredValue: order.declaredValue,
        collectableValue: order.collectableValue || 0,
        itemDescription: order.itemDescription || "",
        length: order.length,
        breadth: order.breadth,
        height: order.height,
        volumetricWeight: order.volumetricWeight || 0,
        dgShipment: order.dgShipment || false,
        invoiceNumber: order.invoiceNumber,
        invoiceUrl: invoiceUrl,
        quantity: order.quantity || 1,
      });
    }

    // Create orders in DB
    const createdOrders = await ForwardOrder.insertMany(ordersToCreate);

    return res
      .status(201)
      .json({ message: "Orders created successfully", orders: createdOrders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

const editOrderByUser = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const orderUpdates = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Unauthorized Access" });
    }

    // Find the order by ID and userId
    const existingOrder = await Order.findOne({ _id: orderId, userId: userId });
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }

    // Ensure the order is not shipped
    if (existingOrder.shipped) {
      return res.status(400).json({ error: "Shipped orders cannot be edited" });
    }

    // Update the order fields
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, userId: userId },
      { ...orderUpdates, shipped: false }, // Directly using `req.body`
      { new: true, runValidators: true } // Return the updated order
    );

    if (!updatedOrder) {
      return res.status(500).json({ error: "Failed to update the order" });
    }

    res.status(200).json(updatedOrder); // Send only updated order
  } catch (error) {
    console.error("Error updating order:", error.message);
    res.status(500).json({
      error: "Failed to update the order, please try again later.",
    });
  }
};

const createReverseOrder = async (req, res) => {
  const userId = req.user.id; // Assumes `req.user.id` is set by authentication middleware.

  try {
    // Verify user exists.
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if bulk or single reverse order request.
    if (Array.isArray(req.body.orderIds) && req.body.orderIds.length > 0) {
      // Bulk reverse order creation.
      const orderIds = req.body.orderIds;

      // Fetch the original orders from the database.
      const originalOrders = await Order.find({
        userId,
        _id: { $in: orderIds },
      });

      if (!originalOrders || originalOrders.length === 0) {
        return res
          .status(404)
          .json({ error: "No valid orders found for reverse creation" });
      }

      // Map to create reverse orders.
      const reverseOrders = originalOrders.map((originalOrder) => ({
        userId: originalOrder.userId,
        orderId: `REVERSE-${originalOrder.orderId}`, // Unique Reverse Order ID.
        orderType: originalOrder.orderType, // Same type as original order.
        consignee: originalOrder.consigneeAddress1, // Swap consignee and pickup details.
        consigneeAddress1: originalOrder.city,
        consigneeAddress2: originalOrder.state,
        city: originalOrder.consigneeAddress1,
        state: originalOrder.consigneeAddress2,
        pincode: originalOrder.pincode,
        telephone: originalOrder.telephone,
        mobile: originalOrder.mobile,
        collectableValue: originalOrder.collectableValue || 0,
        declaredValue: originalOrder.declaredValue || 0,
        itemDescription: originalOrder.itemDescription,
        dgShipment: originalOrder.dgShipment,
        quantity: originalOrder.quantity,
        height: originalOrder.height,
        breadth: originalOrder.breadth,
        length: originalOrder.length,
        volumetricWeight: originalOrder.volumetricWeight,
        actualWeight: originalOrder.actualWeight,
        invoiceNumber: `REV-INV-${Date.now()}`, // New unique invoice number.
        shipped: false,
        status: "pending", // Reverse orders start as pending.
        partner: null, // No partner assigned initially.
        events: [],
      }));

      // Save all reverse orders in bulk.
      const createdReverseOrders = await Order.insertMany(reverseOrders);

      return res.status(200).json({
        success: true,
        message: `${createdReverseOrders.length} reverse orders created successfully.`,
        reverseOrders: createdReverseOrders.map((o) => ({
          orderId: o.orderId,
        })),
      });
    } else {
      // Single reverse order creation.
      const { orderId } = req.body;

      if (!orderId) {
        return res
          .status(400)
          .json({ error: "Order ID is required for reverse creation" });
      }

      // Fetch the original order from the database.
      const originalOrder = await Order.findOne({ userId, _id: orderId });

      if (!originalOrder) {
        return res.status(404).json({ error: "Original order not found" });
      }

      // Create a reverse order based on the original order details.
      const reverseOrder = new Order({
        userId: originalOrder.userId,
        orderId: `REVERSE-${originalOrder.orderId}`, // Unique Reverse Order ID.
        orderType: originalOrder.orderType, // Same type as original order.
        consignee: originalOrder.consigneeAddress1, // Swap consignee and pickup details.
        consigneeAddress1: originalOrder.city,
        consigneeAddress2: originalOrder.state,
        city: originalOrder.consigneeAddress1,
        state: originalOrder.consigneeAddress2,
        pincode: originalOrder.pincode,
        telephone: originalOrder.telephone,
        mobile: originalOrder.mobile,
        collectableValue: originalOrder.collectableValue || 0,
        declaredValue: originalOrder.declaredValue || 0,
        itemDescription: originalOrder.itemDescription,
        dgShipment: originalOrder.dgShipment,
        quantity: originalOrder.quantity,
        height: originalOrder.height,
        breadth: originalOrder.breadth,
        length: originalOrder.length,
        volumetricWeight: originalOrder.volumetricWeight,
        actualWeight: originalOrder.actualWeight,
        invoiceNumber: `REV-INV-${Date.now()}`, // New unique invoice number.
        shipped: false,
        status: "pending", // Reverse orders start as pending.
        partner: null, // No partner assigned initially.
        events: [],
      });

      // Save the reverse order to the database.
      const savedReverseOrder = await reverseOrder.save();

      return res.status(200).json({
        success: true,
        message: "Reverse order created successfully.",
        reverseOrder: {
          orderId: savedReverseOrder.orderId,
        },
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "An error occurred while processing the reverse order",
      details: error.message,
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user.id,
      // Exclude orders where Shipped is true
    }).sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res
      .status(500)
      .json({ message: "Failed to fetch orders, please try again later." });
  }
};

const deleteOrderByUser = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "Un Authorized Access" });
    }

    Order.findByIdAndDelete(id, userId)
      .then((deletedOrder) => {
        if (!deletedOrder) {
          return res.status(404).json({ error: "Order not found" });
        }
        res.status(200).json({
          success: true,
          message: "Order deleted successfully",
          order: deletedOrder,
        });
      })
      .catch((error) => {
        console.error("Error deleting order:", error.message);
        res.status(500).json({
          error: "Failed to delete the order, please try again later.",
        });
      });
  } catch (e) {
    console.error(error.message);
    res
      .status(500)
      .json({ message: "Failed to delete orders, please try again." });
  }
};

const softDeleteOrderByUser = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Unauthorized Access" });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, userId: userId }, // Find order by ID and userId
      { isCancelled: true }, // Set isCancelled to true instead of deleting
      { new: true } // Return the updated order
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error cancelling order:", error.message);
    res.status(500).json({
      error: "Failed to cancel the order, please try again later.",
    });
  }
};

const getOrderByID = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ error: "Unauthorized access. User not found." });
    }

    const order = await Order.findOne({ orderId: id, userId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order:", error.message);
    res
      .status(500)
      .json({ error: "Failed to fetch the order, please try again later." });
  }
};

module.exports = {
  // createOrder,
  createForwardOrder,
  editOrderByUser,
  createReverseOrder,
  softDeleteOrderByUser,
  getOrders,
  deleteOrderByUser,
  getOrderByID,
};
