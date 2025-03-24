const axios = require("axios");
const { getXpressbeesToken } = require("../helpers/authHelpers");
const chargeSheet = require("../chargesSheet");
require("dotenv").config();
const User = require("../models/User");
const Order = require("../models/Order");
const Warehouse = require("../models/wareHouse");
const mongoose = require("mongoose");

// Utility function to extract weight from the carrierName
function extractWeightFromCarrierName(carrierName) {
  const weightMatch = carrierName.match(/(\d+(\.\d+)?)\s?K\.G/);
  return weightMatch ? parseFloat(weightMatch[1]) : 0;
}

async function calculateCharges(req, res) {
  const {
    chargeableWeight,
    CODAmount,
    productType,
    originPincode,
    destinationPincode,
    carrierName,
  } = req.body;

  try {
    const userId = req.user.id;
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ error: "User not found" });
    }

    const customerType = userProfile.customerType.toLowerCase();
    const multiplierMap = { bronze: 2.5, silver: 2.3, gold: 2, platinum: 1.8 };
    const multiplier = multiplierMap[customerType] || 1;

    const partnerCharges = chargeSheet.find(
      (sheet) => sheet.customerType.toLowerCase() === customerType
    )?.deliveryPartners;

    if (!partnerCharges) {
      return res
        .status(400)
        .json({ message: "Customer type not found in charge sheet." });
    }

    let chargesBreakdown = [];

    // Process chargeSheet partners (static rates)
    for (const partner of partnerCharges) {
      if (
        chargeableWeight <= partner.chargeableWeight &&
        partner.carrierName.toLowerCase() === carrierName.toLowerCase()
      ) {
        const freightCharge = partner.freight * chargeableWeight;
        const codCharge =
          productType === "COD" ? (partner.codPercentage / 100) * CODAmount : 0;
        const total = (freightCharge + codCharge) * multiplier;

        chargesBreakdown.push({
          carrierName: partner.carrierName,
          serviceType: partner.serviceType || "Standard",
          totalPrice: total,
          codCharge: codCharge,
          freightCharge: freightCharge,
          otherCharges: 0, // No other charges in static rates
        });
      }
    }

    // Fetch API-based partner charges only for the specified carrier
    let apiCharges = null;
    switch (carrierName.toLowerCase()) {
      case "ecom express":
        apiCharges = await getEcomCharges(
          originPincode,
          destinationPincode,
          chargeableWeight,
          CODAmount,
          productType
        );
        break;
      case "xpressbees":
        apiCharges = await getXpressbeesCharges(
          originPincode,
          destinationPincode,
          chargeableWeight,
          CODAmount,
          productType
        );
        break;
      case "delhivery":
        apiCharges = await getDelhiveryCharges(
          originPincode,
          destinationPincode,
          chargeableWeight,
          CODAmount,
          productType
        );
        break;
      default:
        break;
    }

    // Add API-based partner services
    if (apiCharges?.services) {
      apiCharges.services.forEach((service) => {
        const totalPrice = (service.total_charges || 0) * multiplier;
        const codCharge = service.cod_charge || 0;
        const freightCharge = service.freight_charge || 0;
        const otherCharges = totalPrice - codCharge - freightCharge;

        chargesBreakdown.push({
          carrierName: carrierName,
          serviceType: service.name,
          totalPrice: totalPrice,
          codCharge: codCharge,
          freightCharge: freightCharge,
          otherCharges: otherCharges,
        });
      });
    }

    res.json({
      message: "Charges calculated successfully.",
      charges: chargesBreakdown,
    });
  } catch (error) {
    console.error("Error calculating charges:", error);
    res.status(500).json({
      message: "Error calculating charges.",
      error: error.message,
    });
  }
}

async function calculateShippingCharges(req, res) {
  const { orderIds, pickUpWareHouse, returnWarehouse, carrierName } = req.body;

  try {
    const userId = req.user.id;
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ error: "User not found" });
    }

    const customerType = userProfile.customerType.toLowerCase();
    const multiplierMap = { bronze: 2.5, silver: 2.3, gold: 2, platinum: 1.8 };
    const multiplier = multiplierMap[customerType] || 1;

    let originPincode;
    if (pickUpWareHouse === "Ship Duniya") {
      originPincode = "201301";
    } else {
      if (!mongoose.Types.ObjectId.isValid(pickUpWareHouse)) {
        return res.status(400).json({ message: "Invalid pickup warehouse ID." });
      }
      const warehouse = await Warehouse.findById(pickUpWareHouse);
      originPincode = warehouse?.pincode;
    }

    if (!originPincode) {
      return res.status(400).json({ message: "Could not determine origin pincode." });
    }

    const requestedCarrier = carrierName.toLowerCase().trim();
    const uniqueServices = new Map();

    for (const orderId of orderIds) {
      const orderDetails = await fetchOrderDetails(orderId);
      if (!orderDetails) continue;

      const { chargeableWeight, CODAmount, productType, pincode: destinationPincode, height, breadth, length } = orderDetails;
      if (!destinationPincode || isNaN(chargeableWeight)) continue;

      const carrierResponse = await getCarrierCharges(requestedCarrier, originPincode, destinationPincode, chargeableWeight, CODAmount, productType, height, breadth, length);

      if (carrierResponse?.services) {
        carrierResponse.services.forEach((service) => {
          const serviceKey = `${service.name}|${service.total_charges}`;
          if (!uniqueServices.has(serviceKey)) {
            uniqueServices.set(serviceKey, {
              carrierName: requestedCarrier,
              serviceType: service.name,
              totalPrice: (service.total_charges || 0) * multiplier,
            });
          }
        });
      }
    }

    const chargesBreakdown = Array.from(uniqueServices.values()).sort((a, b) => a.totalPrice - b.totalPrice);
    res.json({ message: "Shipping charges calculated successfully.", charges: chargesBreakdown });
  } catch (error) {
    console.error("Error calculating shipping charges:", error);
    res.status(500).json({ message: "Error calculating shipping charges.", error: error.message });
  }
}

async function fetchOrderDetails(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return null;
  return {
    chargeableWeight: parseFloat(order.volumetricWeight) || parseFloat(order.actualWeight),
    CODAmount: order.collectableValue,
    pincode: order.pincode,
    productType: order.type,
    height: order.height,
    breadth: order.breadth,
    length: order.length,
  };
}

async function getCarrierCharges(carrier, origin, destination, weight, codAmount, productType, height, breadth, length) {
  switch (carrier) {
    case "ecom":
      return getEcomCharges(origin, destination, weight, codAmount, productType);
    case "xpressbees":
      return getXpressbeesCharges(origin, destination, weight, codAmount, productType, height, breadth, length);
    case "delhivery":
      return getDelhiveryCharges(origin, destination, weight, codAmount, productType);
    default:
      return null;
  }
}

async function getEcomCharges(origin, destination, weight, codAmount, productType) {
  try {
    if (!origin || !destination) {
      console.error("❌ Error: Origin or Destination Pincode is missing!");
      return null;
    }

    if (isNaN(weight) || weight <= 0) {
      console.error("❌ Error: Invalid Chargeable Weight:", weight);
      return null;
    }

     // Add default value for productType
     const product = (productType || "ppd").toLowerCase();

    // Prepare payload
    const payload = {
      orginPincode: origin,
      destinationPincode: destination,
      productType: product === "cod" ? "cod" : "ppd", // Default to prepaid
      chargeableWeight: Math.max(1, weight), // Minimum weight is 1
      codAmount: product === "cod" ? codAmount || 0 : 0,
    };

    // URL encode the JSON input
    const jsonInput = JSON.stringify([payload]); // No encoding

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append("username", encodeURIComponent(process.env.ECOM_USERID));
    formData.append("password", encodeURIComponent(process.env.ECOM_PASSWORD));
    formData.append("json_input", jsonInput);

    // Make the API request
    const response = await axios.post(
      "https://ratecard.ecomexpress.in/services/rateCalculatorAPI/",
      formData,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000,
      }
    );

    // Validate response
    if (!Array.isArray(response.data) || response.data.length === 0) {
      console.error("❌ Invalid Ecom response format:", response.data);
      return null;
    }

    const ecomData = response.data[0];

    if (!ecomData.success) {
      console.error("❌ Ecom API error:", ecomData.errors);
      return null;
    }

    // Return the charges breakdown
    return {
      services: [
        {
          name: "Ecom Express",
          total_charges: ecomData.chargesBreakup?.total_charge || 0,
        },
      ],
    };
  } catch (error) {
    console.error("❌ Error fetching Ecom charges:", error.message);
    return null;
  }
}

// Updated Xpressbees handler
async function getXpressbeesCharges(
  origin,
  destination,
  weight,
  codAmount,
  productType,
  retries = 3,
  timeout = 10000
) {
  try {
    if (!origin || !destination) {
      console.error("❌ Error: Origin or Destination Pincode is missing!");
      return null;
    }

    const weightInGrams = Math.round(weight * 1000);
    const token = await getXpressbeesToken();

    const url = "https://shipment.xpressbees.com/api/courier/serviceability";
    const payload = {
      origin: origin.toString(),
      destination: destination.toString(),
      payment_type: productType === "COD" ? "cod" : "prepaid",
      weight: weightInGrams.toString(),
      length: "10", // Default dimensions
      breadth: "10",
      height: "10",
    };

    if (productType === "COD") {
      payload.order_amount = codAmount.toString();
    }

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: timeout,
    });

    if (!response.data?.data) {
      console.error("❌ Invalid Xpressbees response format:", response.data);
      return null;
    }

    return {
      services: response.data.data.map((service) => ({
        name:
          service.name.replace(/Xpressbees/gi, "").trim() || "Standard Service",
        total_charges: service.total_charges,
        cod_charge: service.cod_charges || 0,
        freight_charge: service.freight_charges || 0,
        other_charges: service.total_charges - (service.freight_charges || 0) - (service.cod_charges || 0),
      })),
    };
  } catch (error) {
    console.error("❌ Error fetching Xpressbees charges:", error.message);

    // Retry mechanism
    if (retries > 0) {
      console.log(`Retrying... Attempts left: ${retries}`);
      return getXpressbeesCharges(
        origin,
        destination,
        weight,
        codAmount,
        productType,
        retries - 1,
        timeout
      );
    }

    return null;
  }
}

// Updated Delhivery handler
async function getDelhiveryCharges(origin, destination, weight, codAmount, productType) {
  try {
    if (!origin || !destination) return null;
    if (isNaN(weight) || weight <= 0) return null;

    const weightInGrams = Math.round(weight * 1000);
    const url = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&o_pin=${origin}&d_pin=${destination}&cgm=${weightInGrams}&pt=${
      productType === "COD" ? "COD" : "Pre-paid"
    }&cod=${productType === "COD" ? codAmount : 0}`;

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

    return {
      services: response.data.map((service, index) => ({
        name: service.service_type
          ? `${service.service_type} Service`
          : `Delhivery Service ${index + 1}`,
        total_charges: service.total_amount || 0,
        cod_charge: service.charge_COD || 0,
        freight_charge: service.charge_DL || 0,
        other_charges: service.total_amount - (service.charge_DL || 0) - (service.charge_COD || 0),
      })),
    };
  } catch (error) {
    console.error("❌ Error fetching Delhivery charges:", error.message);
    return null;
  }
}

module.exports = {
  calculateCharges,
  calculateShippingCharges,
};