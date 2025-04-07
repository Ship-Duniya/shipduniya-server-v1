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

    if (req.file) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.worksheets[0];
      const sheetData = [];
      const validationErrors = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          // Skip header row
          const rowData = {
            rowNumber,
            consignee: row.getCell(1).value,
            consigneeAddress1: row.getCell(2).value,
            consigneeAddress2: row.getCell(3).value,
            orderType: (row.getCell(4).value || "PREPAID")
              .toString()
              .toUpperCase(),
            pincode: row.getCell(5).value,
            mobile: row.getCell(6).value || user.mobile,
            invoiceNumber:
              row.getCell(7).value ||
              `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            telephone: row.getCell(8).value || user.telephone,
            city: row.getCell(9).value,
            state: row.getCell(10).value,
            length: row.getCell(11).value,
            breadth: row.getCell(12).value,
            height: row.getCell(13).value,
            collectableValue: parseFloat(row.getCell(14).value) || 0,
            declaredValue: parseFloat(row.getCell(15).value) || 0,
            itemDescription: row.getCell(16).value,
            dgShipment: row.getCell(17).value || false,
            quantity: parseInt(row.getCell(18).value) || 1,
            volumetricWeight: parseFloat(row.getCell(19).value) || 0,
            actualWeight: parseFloat(row.getCell(20).value),
          };

          // Validate each field
          const errors = [];

          if (
            !rowData.consignee ||
            rowData.consignee.toString().trim() === ""
          ) {
            errors.push("Consignee is required");
          }

          if (
            !rowData.consigneeAddress1 ||
            rowData.consigneeAddress1.toString().trim() === ""
          ) {
            errors.push("Consignee Address 1 is required");
          }

          if (rowData.orderType !== "PREPAID" && rowData.orderType !== "COD") {
            errors.push("Order Type must be either PREPAID or COD");
          }

          if (
            !rowData.pincode ||
            rowData.pincode.toString().length !== 6 ||
            isNaN(rowData.pincode)
          ) {
            errors.push("Pincode must be 6 digits");
          }

          if (
            !rowData.mobile ||
            rowData.mobile.toString().replace(/\D/g, "").length !== 10
          ) {
            errors.push("Mobile must be 10 digits");
          }

          if (
            !rowData.invoiceNumber ||
            rowData.invoiceNumber.toString().trim() === ""
          ) {
            errors.push("Invoice Number is required");
          }

          if (
            rowData.orderType === "PREPAID" &&
            rowData.collectableValue !== 0
          ) {
            errors.push("Collectable Value must be 0 for PREPAID orders");
          }

          if (rowData.orderType === "COD" && rowData.collectableValue <= 0) {
            errors.push(
              "Collectable Value must be greater than 0 for COD orders"
            );
          }

          if (rowData.collectableValue > rowData.declaredValue) {
            errors.push(
              "Collectable Value cannot be greater than Declared Value"
            );
          }

          if (rowData.declaredValue <= 0) {
            errors.push("Declared Value must be greater than 0");
          }

          if (
            !rowData.itemDescription ||
            rowData.itemDescription.toString().trim() === ""
          ) {
            errors.push("Item Description is required");
          }

          if (rowData.quantity <= 0) {
            errors.push("Quantity must be greater than 0");
          }

          if (rowData.actualWeight <= 0) {
            errors.push("Actual Weight must be greater than 0");
          }

          if (errors.length > 0) {
            validationErrors.push({
              row: rowNumber,
              errors: errors,
            });
          } else {
            sheetData.push(rowData);
          }
        }
      });

      if (validationErrors.length > 0) {
        const errorMessages = validationErrors.map(
          (err) => `Row ${err.row}: ${err.errors.join(", ")}`
        );
        return res.status(400).json({
          error: "Validation errors in Excel file",
          details: errorMessages,
        });
      }

      if (sheetData.length === 0) {
        return res
          .status(400)
          .json({ error: "Uploaded file is empty or invalid" });
      }

      const bulkOrders = sheetData.map((order) => ({
        userId: userId,
        orderId: `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        orderType: order.orderType,
        consignee: order.consignee || user.name,
        consigneeAddress1: order.consigneeAddress1,
        consigneeAddress2: order.consigneeAddress2,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        telephone: order.telephone,
        mobile: order.mobile,
        collectableValue: order.collectableValue,
        declaredValue: order.declaredValue,
        itemDescription: order.itemDescription,
        dgShipment: order.dgShipment,
        quantity: order.quantity,
        height: order.height,
        breadth: order.breadth,
        length: order.length,
        volumetricWeight: order.volumetricWeight,
        actualWeight: order.actualWeight,
        invoiceNumber: order.invoiceNumber,
        shipped: false,
        status: "pending",
        partner: null,
        events: [],
      }));

      const createdOrders = await Order.insertMany(bulkOrders);
      return res.status(200).json({
        success: true,
        message: `${createdOrders.length} orders created successfully.`,
        orders: createdOrders.map((o) => ({ orderId: o.orderId })),
      });
    } else {
      // Single order (Data provided in JSON body).
      const { order } = req.body;

      let ordertype = order.orderType.toUpperCase();

      if (!order) {
        return res.status(400).json({ error: "Order data is missing" });
      }

      const newOrder = new Order({
        userId: userId,
        orderId: `ORDER-${Date.now()}`, // Unique Order ID.
        orderType: ordertype || "PREPAID",
        consignee: order.consignee || user.name,
        consigneeAddress1: order.consigneeAddress1,
        consigneeAddress2: order.consigneeAddress2,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        telephone: order.telephone || user.telephone,
        mobile: order.mobile || user.mobile,
        collectableValue: order.collectableValue,
        declaredValue: order.declaredValue,
        itemDescription: order.itemDescription,
        dgShipment: order.dgShipment || false,
        quantity: order.quantity || 1,
        height: order.height,
        breadth: order.breadth,
        length: order.length,
        volumetricWeight: order.volumetricWeight || 0,
        actualWeight: order.actualWeight,
        invoiceNumber: `INV-${Date.now()}`,
        shipped: false,
        status: "pending",
        partner: null,
        events: [],
      });

      // Save the order to the database.
      const savedOrder = await newOrder.save();

      return res.status(200).json({
        success: true,
        message: "Order created successfully",
        order: {
          orderId: savedOrder.orderId,
        },
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "An error occurred while processing the order",
      details: error.message,
    });
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
