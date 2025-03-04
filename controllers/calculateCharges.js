const axios = require("axios");
const { getXpressbeesToken } = require("../helpers/authHelpers");
const chargeSheet = require("../chargesSheet"); // Import the chargeSheet data
require("dotenv").config(); // To load .env variables
const User = require("../models/User");
const Order = require("../models/Order");
const Warehouse = require("../models/wareHouse");
const mongoose = require("mongoose");

async function calculateCharges(req, res) {
  const {
    chargeableWeight,
    CODAmount,
    productType,
    originPincode,
    destinationPincode,
  } = req.body;

  console.log(
    chargeableWeight,
    CODAmount,
    productType,
    originPincode,
    destinationPincode
  );

  try {
    const userId = req.user.id;
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ error: "User not found" });
    }

    const customerType = userProfile.customerType;
    const partnerCharges = chargeSheet.find(
      (sheet) => sheet.customerType === customerType
    )?.deliveryPartners;

    if (!partnerCharges) {
      return res
        .status(400)
        .json({ message: "Customer type not found in charge sheet." });
    }

    let chargesBreakdown = [];

    for (const partner of partnerCharges) {
      if (chargeableWeight <= partner.chargeableWeight) {
        let freightCharge = partner.freight * chargeableWeight;
        let codCharge =
          productType === "COD" ? (partner.codPercentage / 100) * CODAmount : 0;

        chargesBreakdown.push({
          carrierName: partner.carrierName,
          breakdown: {
            freightCharge,
            codCharge,
            total: freightCharge + codCharge,
          },
        });
      }
    }

    const ecomChargeDetails = await getEcomCharges(
      originPincode,
      destinationPincode,
      chargeableWeight,
      CODAmount
    );
    const xpressbeesChargeDetails = await getXpressbeesCharges(
      originPincode,
      destinationPincode,
      chargeableWeight,
      CODAmount
    );
    const delhiveryChargeDetails = await getDelhiveryCharges(
      originPincode,
      destinationPincode,
      chargeableWeight
    );

    if (ecomChargeDetails) {
      chargesBreakdown.push({
        carrierName: "Ecom Express",
        breakdown: ecomChargeDetails,
      });
    }
    if (xpressbeesChargeDetails) {
      chargesBreakdown.push({
        carrierName: "Xpressbees",
        breakdown: xpressbeesChargeDetails,
      });
    }
    if (delhiveryChargeDetails) {
      chargesBreakdown.push({
        carrierName: "Delhivery",
        breakdown: delhiveryChargeDetails,
      });
    }

    res.json({
      message: "Charges calculated successfully.",
      chargesBreakdown,
    });
  } catch (error) {
    console.error("Error calculating charges:", error);
    res
      .status(500)
      .json({ message: "Error calculating charges.", error: error.message });
  }
}

// Utility function to extract weight from the carrierName
function extractWeightFromCarrierName(carrierName) {
  const weightMatch = carrierName.match(/(\d+(\.\d+)?)\s?K\.G/); // Regex to match weight like 0.5 K.G, 1 K.G, etc.
  if (weightMatch) {
    return parseFloat(weightMatch[1]);
  }
  return 0; // Return 0 if weight is not found in carrierName
}

// Function to calculate shipping charges
async function calculateShippingCharges(req, res) {
  const { orderIds, warehouseId, partner } = req.body; // Get partner from request

  try {
    const userId = req.user.id;
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ error: "User not found" });
    }

    const customerType = userProfile.customerType;
    const partnerCharges = chargeSheet.find(
      (sheet) => sheet.customerType === customerType
    )?.deliveryPartners;

    if (!partnerCharges) {
      return res
        .status(400)
        .json({ message: "Customer type not found in charge sheet." });
    }

    let originPincode;

    if (warehouseId === "Ship Duniya") {
      originPincode = "201301";
    } else {
      if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
        return res.status(400).json({ message: "Invalid warehouse ID." });
      }

      const warehouse = await Warehouse.findById(warehouseId);
      if (!warehouse || !warehouse.pincode) {
        return res
          .status(400)
          .json({ message: "Invalid warehouse ID or missing pincode." });
      }
      originPincode = warehouse.pincode;
    }

    let chargesBreakdown = [];

    for (const orderId of orderIds) {
      const orderDetails = await fetchOrderDetails(orderId);
      if (!orderDetails) continue;

      const {
        chargeableWeight,
        CODAmount,
        productType,
        pincode: destinationPincode,
      } = orderDetails;

      if (!originPincode || !destinationPincode) {
        console.error("❌ Error: Origin or Destination Pincode is missing!");
        continue;
      }

      if (isNaN(chargeableWeight) || isNaN(CODAmount)) continue;

      let partnerChargeDetails = null;

      switch (partner.toLowerCase()) {
        case "ecom":
          partnerChargeDetails = await getEcomCharges(
            originPincode,
            destinationPincode,
            chargeableWeight,
            CODAmount
          );
          break;
        case "xpressbees":
          partnerChargeDetails = await getXpressbeesCharges(
            originPincode,
            destinationPincode,
            chargeableWeight,
            CODAmount
          );
          break;
        case "delhivery":
          partnerChargeDetails = await getDelhiveryCharges(
            originPincode,
            destinationPincode,
            chargeableWeight,
            CODAmount
          );
          break;
        default:
          return res
            .status(400)
            .json({ message: "Invalid partner specified." });
      }

      if (partnerChargeDetails) {
        chargesBreakdown.push({
          carrierName: partner.charAt(0).toUpperCase() + partner.slice(1),
          totalPrice:
            partnerChargeDetails.total_charge ||
            partnerChargeDetails.total_charges ||
            partnerChargeDetails.total_amount,
        });
      }
    }

    res.json({
      message: "Shipping charges calculated successfully.",
      charges: chargesBreakdown,
    });
  } catch (error) {
    console.error("Error calculating shipping charges:", error);
    res.status(500).json({
      message: "Error calculating shipping charges.",
      error: error.message,
    });
  }
}

// Function to fetch order details dynamically (replace with actual database or API call)
async function fetchOrderDetails(orderId) {
  // Implement actual logic to fetch order details from the database or an external API
  const order = await Order.findById(orderId);
  if (!order) return null;

  return {
    chargeableWeight:
      parseFloat(order.volumetricWeight) || parseFloat(order.actualWeight),
    CODAmount: order.collectableValue,
    pincode: order.pincode, // Destination Pincode
    productType: order.type,
  };
}

// Get charges from Ecom API
async function getEcomCharges(
  originPincode,
  destinationPincode,
  chargeableWeight,
  declaredValue,
  productType = "ppd",
  retry = 1
) {
  try {
    // Validate inputs
    if (!originPincode || !destinationPincode) {
      console.error("❌ Error: Origin or Destination Pincode is missing!");
      return null;
    }

    if (isNaN(chargeableWeight) || chargeableWeight <= 0) {
      console.error("❌ Error: Invalid Chargeable Weight:", chargeableWeight);
      return null;
    }

    productType = (productType || "ppd").toLowerCase();

    const codAmount = productType === "cod" ? declaredValue : 0;

    // Prepare payload
    let payload = {
      orginPincode: originPincode,
      destinationPincode: destinationPincode,
      productType: productType,
      chargeableWeight: Math.max(1, chargeableWeight),
      codAmount: codAmount,
    };

    const requestBody = new URLSearchParams({
      username: encodeURIComponent(process.env.ECOM_USERID),
      password: encodeURIComponent(process.env.ECOM_PASSWORD),
      json_input: JSON.stringify([payload]),
    });

    // Make the API request
    const ecomResponse = await axios.post(
      "https://ratecard.ecomexpress.in/services/rateCalculatorAPI/",
      requestBody,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000,
      }
    );

    if (!Array.isArray(ecomResponse.data) || ecomResponse.data.length === 0) {
      console.error("❌ Invalid Ecom response format:", ecomResponse.data);
      return null;
    }

    const ecomData = ecomResponse.data[0];

    if (!ecomData.success) {
      console.error("❌ Ecom API error:", ecomData.errors);
      return null;
    }

    return ecomData.chargesBreakup || {};
  } catch (error) {
    console.error("❌ Error fetching Ecom charges:", error.message);

    if (retry > 0) {
      console.warn("🔄 Retrying Ecom API request...");
      return getEcomCharges(
        originPincode,
        destinationPincode,
        chargeableWeight,
        declaredValue,
        productType,
        retry - 1
      );
    }

    return null;
  }
}

// Get charges from Xpressbees API
async function getXpressbeesCharges(
  originPincode,
  destinationPincode,
  chargeableWeight,
  declaredValue,
  productType = "prepaid",
  retry = 1
) {
  try {
    if (!originPincode || !destinationPincode) {
      console.error("❌ Error: Origin or Destination Pincode is missing!");
      return null;
    }

    if (isNaN(chargeableWeight) || chargeableWeight <= 0) {
      console.error("❌ Error: Invalid Chargeable Weight:", chargeableWeight);
      return null;
    }

    productType = (productType || "prepaid").toLowerCase();
    const weightInGrams = Math.round(chargeableWeight * 1000);
    const token = await getXpressbeesToken();

    const url = "https://shipment.xpressbees.com/api/courier/serviceability";

    let payload = {
      origin: originPincode.toString(),
      destination: destinationPincode.toString(),
      payment_type: productType === "cod" ? "cod" : "prepaid",
      weight: weightInGrams.toString(),
      length: "10",
      breadth: "10",
      height: "10",
    };

    if (productType === "cod") {
      payload.order_amount = declaredValue.toString();
    }

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 5000,
    });

    if (!response.data || !Array.isArray(response.data.data)) {
      console.error("❌ Invalid Xpressbees response format:", response.data);
      return null;
    }

    let xpressbeesOptions = response.data.data;

    // ✅ Fix: Sort services by weight & Pick the Best Match
    xpressbeesOptions.sort((a, b) => a.chargeable_weight - b.chargeable_weight);

    let bestXpressbeesOption = xpressbeesOptions.find(
      (service) => service.chargeable_weight >= weightInGrams
    );

    if (!bestXpressbeesOption) {
      bestXpressbeesOption = xpressbeesOptions.reduce((prev, curr) =>
        Math.abs(curr.chargeable_weight - weightInGrams) <
        Math.abs(prev.chargeable_weight - weightInGrams)
          ? curr
          : prev
      );
    }

    if (!bestXpressbeesOption) {
      console.warn("⚠️ No suitable Xpressbees service found.");
      return null;
    }

    // ✅ **Estimate missing charges like Fuel & GST**
    const fuelCharge = bestXpressbeesOption.freight_charges * 0.12; // Assume 12% fuel charge
    const gst = (bestXpressbeesOption.freight_charges + fuelCharge) * 0.18; // Assume 18% GST
    const totalWithGST =
      bestXpressbeesOption.freight_charges + fuelCharge + gst;

    return {
      ...bestXpressbeesOption,
      estimated_fuel: fuelCharge,
      estimated_gst: gst,
      total_with_estimated_gst: totalWithGST,
    };
  } catch (error) {
    console.error("❌ Error fetching Xpressbees charges:", error.message);
    return null;
  }
}

// Get charges from Delhivery API
async function getDelhiveryCharges(
  originPincode,
  destinationPincode,
  chargeableWeight,
  declaredValue,
  productType = "prepaid"
) {
  try {
    if (!originPincode || !destinationPincode) return null;
    if (isNaN(chargeableWeight) || chargeableWeight <= 0) return null;

    const weightInGrams = Math.round(chargeableWeight * 1000);
    const url = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&o_pin=${originPincode}&d_pin=${destinationPincode}&cgm=${weightInGrams}&pt=${
      productType === "cod" ? "COD" : "Pre-paid"
    }&cod=${productType === "cod" ? declaredValue : 0}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.error("❌ Invalid Delhivery response:", response.data);
      return null;
    }

    return response.data[0] || {};
  } catch (error) {
    console.error("❌ Error fetching Delhivery charges:", error.message);
    return null;
  }
}

module.exports = {
  calculateCharges,
  calculateShippingCharges,
};
