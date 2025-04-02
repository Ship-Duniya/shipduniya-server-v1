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
    CODAmount = 0,
    productType,
    originPincode,
    destinationPincode,
    carrierName
  } = req.body;

  try {
    // Validate required fields
    if (!chargeableWeight || !productType || !originPincode || !destinationPincode) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Get user profile and customer type
    const userId = req.user.id;
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ error: "User not found" });
    }

    const customerType = userProfile.customerType.toLowerCase();
    const multiplierMap = { bronze: 2.5, silver: 2.3, gold: 2, platinum: 1.8 };
    const multiplier = multiplierMap[customerType] || 1;

    // Normalize product type for consistent comparison
    const normalizedProductType = productType.toLowerCase();

    // Get partner charges from charge sheet
    const partnerCharges = chargeSheet.find(
      (sheet) => sheet.customerType.toLowerCase() === customerType
    )?.deliveryPartners;

    if (!partnerCharges) {
      return res.status(400).json({ message: "Customer type not found in charge sheet." });
    }

    let chargesBreakdown = [];

    // Process static rates from charge sheet
    for (const partner of partnerCharges) {
      if (chargeableWeight <= partner.chargeableWeight) {
        const freightCharge = partner.freight * chargeableWeight;
        const codCharge = normalizedProductType === "cod" 
          ? (partner.codPercentage / 100) * CODAmount 
          : 0;
        const total = (freightCharge + codCharge) * multiplier;

        chargesBreakdown.push({
          carrierName: partner.carrierName,
          serviceType: partner.serviceType || "Standard",
          totalPrice: total,
          codCharge: codCharge,
          freightCharge: freightCharge,
          otherCharges: total - freightCharge - codCharge
        });
      }
    }

    // Fetch dynamic rates from carrier APIs
    const apiPromises = [];
    
    if (!carrierName || carrierName.toLowerCase() === "xpressbees") {
      apiPromises.push(
        getXpressbeesCharges(originPincode, destinationPincode, chargeableWeight, CODAmount, normalizedProductType)
      );
    }
    
    if (!carrierName || carrierName.toLowerCase() === "delhivery") {
      apiPromises.push(
        getDelhiveryCharges(originPincode, destinationPincode, chargeableWeight, CODAmount, normalizedProductType)
      );
    }
    
    if (!carrierName || carrierName.toLowerCase() === "ecom express") {
      apiPromises.push(
        getEcomCharges(originPincode, destinationPincode, chargeableWeight, CODAmount, normalizedProductType)
      );
    }

    const [xpressbeesCharges, delhiveryCharges, ecomCharges] = await Promise.all(apiPromises);

    // Process Xpressbees charges
    if (xpressbeesCharges?.services) {
      xpressbeesCharges.services.forEach(service => {
        const baseCod = service.cod_charges || 0;
        const baseFreight = service.freight_charges || 0;
        const baseTotal = service.total_charges || 0;
        
        chargesBreakdown.push({
          carrierName: "Xpressbees",
          serviceType: service.name,
          totalPrice: baseTotal * multiplier,
          codCharge: baseCod * multiplier,
          freightCharge: baseFreight * multiplier,
          otherCharges: (baseTotal - baseCod - baseFreight) * multiplier
        });
      });
    }

    // Process Delhivery charges
    if (delhiveryCharges?.services) {
      delhiveryCharges.services.forEach(service => {
        const baseCod = service.cod_charge || 0;
        const baseFreight = service.freight_charge || 0;
        const baseTotal = service.total_charges || 0;
        
        chargesBreakdown.push({
          carrierName: "Delhivery",
          serviceType: service.name,
          totalPrice: baseTotal * multiplier,
          codCharge: baseCod * multiplier,
          freightCharge: baseFreight * multiplier,
          otherCharges: (baseTotal - baseCod - baseFreight) * multiplier
        });
      });
    }

    // Process Ecom Express charges
    if (ecomCharges?.services) {
      ecomCharges.services.forEach(service => {
        const baseCod = service.cod_charge || 0;
        const baseFreight = service.freight_charge || 0;
        const baseTotal = service.total_charges || 0;
        
        chargesBreakdown.push({
          carrierName: "Ecom Express",
          serviceType: service.name,
          totalPrice: baseTotal * multiplier,
          codCharge: baseCod * multiplier,
          freightCharge: baseFreight * multiplier,
          otherCharges: (baseTotal - baseCod - baseFreight) * multiplier
        });
      });
    }

    // Filter by carrier if specified
    if (carrierName) {
      chargesBreakdown = chargesBreakdown.filter(
        charge => charge.carrierName.toLowerCase() === carrierName.toLowerCase()
      );
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

// Carrier API Helpers
async function getXpressbeesCharges(origin, destination, weight, codAmount, productType) {
  try {
    const token = await getXpressbeesToken();
    const payload = {
      origin: origin.toString(),
      destination: destination.toString(),
      payment_type: productType === "cod" ? "cod" : "prepaid",
      weight: Math.round(weight * 1000), // Convert kg to grams
      length: 10,
      breadth: 10,
      height: 10
    };

    if (productType === "cod") {
      payload.order_amount = codAmount;
    }

    const response = await axios.post(
      "https://shipment.xpressbees.com/api/courier/serviceability",
      payload,
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    return {
      services: response.data.data.map(service => ({
        name: service.name,
        total_charges: service.total_charges,
        cod_charges: service.cod_charges,
        freight_charges: service.freight_charges
      }))
    };
  } catch (error) {
    console.error("Xpressbees API error:", error.message);
    return null;
  }
}

async function getDelhiveryCharges(origin, destination, weight, codAmount, productType) {
  try {
    const weightInGrams = Math.round(weight * 1000);
    const url = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&o_pin=${origin}&d_pin=${destination}&cgm=${weightInGrams}&pt=${
      productType === "cod" ? "COD" : "Pre-paid"
    }&cod=${productType === "cod" ? codAmount : 0}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });

    return {
      services: response.data.map(service => ({
        name: service.service_type || "Delhivery Service",
        total_charges: service.total_amount || 0,
        cod_charge: service.charge_COD || 0,
        freight_charge: service.charge_DL || 0
      }))
    };
  } catch (error) {
    console.error("Delhivery API error:", error.message);
    return null;
  }
}

async function getEcomCharges(origin, destination, weight, codAmount, productType) {
  try {
    const payload = {
      orginPincode: origin,
      destinationPincode: destination,
      productType: productType === "cod" ? "cod" : "ppd",
      chargeableWeight: Math.max(1, weight),
      codAmount: productType === "cod" ? codAmount || 0 : 0,
    };

    const formData = new URLSearchParams();
    formData.append("username", process.env.ECOM_USERID);
    formData.append("password", process.env.ECOM_PASSWORD);
    formData.append("json_input", JSON.stringify([payload]));

    const response = await axios.post(
      "https://ratecard.ecomexpress.in/services/rateCalculatorAPI/",
      formData,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000,
      }
    );

    const ecomData = response.data[0];
    if (!ecomData.success) {
      throw new Error(ecomData.errors || "Ecom API error");
    }

    return {
      services: [{
        name: "Ecom Express",
        total_charges: ecomData.total_charge || 0,
        cod_charge: ecomData.COD || 0,
        freight_charge: ecomData.FRT || 0
      }]
    };
  } catch (error) {
    console.error("Ecom Express API error:", error.message);
    return null;
  }
}

module.exports = {
  calculateCharges,
  calculateShippingCharges,
};