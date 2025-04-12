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
    carrierName,
    height = 10,
    breadth = 10,
    length = 10,
  } = req.body;

  try {
    // Validate required fields
    if (
      !chargeableWeight ||
      !productType ||
      !originPincode ||
      !destinationPincode
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Get user profile and customer type
    const userId = req.user.id;
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ error: "User not found" });
    }

    const customerType = userProfile.customerType.toLowerCase();
    const multiplierMaps = {
      xpressbees: { bronze: 3, silver: 2.5, gold: 2.2, platinum: 2 },
      delhivery: { bronze: 2.5, silver: 2.3, gold: 2, platinum: 1.8 },
      ecom: { bronze: 2.5, silver: 2.3, gold: 2, platinum: 1.8 },
      default: { bronze: 2.5, silver: 2.3, gold: 2, platinum: 1.8 },
    };

    const getMultiplier = (carrier) =>
      multiplierMaps[carrier]?.[customerType] ||
      multiplierMaps.default[customerType] ||
      1;

    // Normalize product type for consistent comparison
    const normalizedProductType = productType.toLowerCase();

    // Get partner charges from charge sheet
    const partnerCharges = chargeSheet.find(
      (sheet) => sheet.customerType.toLowerCase() === customerType
    )?.deliveryPartners;

    if (!partnerCharges) {
      return res
        .status(400)
        .json({ message: "Customer type not found in charge sheet." });
    }

    let chargesBreakdown = [];

    // Process static rates from charge sheet
    for (const partner of partnerCharges) {
      // Skip if carrierName is specified and doesn't match
      if (
        carrierName &&
        partner.carrierName.toLowerCase() !== carrierName.toLowerCase()
      ) {
        continue;
      }

      if (chargeableWeight <= partner.chargeableWeight) {
        const multiplier = getMultiplier(partner.carrierName.toLowerCase());
        const freightCharge = partner.freight * chargeableWeight;
        const codCharge =
          normalizedProductType === "cod"
            ? (partner.codPercentage / 100) * CODAmount
            : 0;
        const total = (freightCharge + codCharge) * multiplier;

        chargesBreakdown.push({
          carrierName: partner.carrierName,
          serviceType: partner.serviceType || "Standard",
          totalPrice: total,
          codCharge: codCharge * multiplier,
          freightCharge: freightCharge * multiplier,
          otherCharges: (total - freightCharge - codCharge) * multiplier,
        });
      }
    }

    // Fetch dynamic rates from carrier APIs (fixed order)
    const apiPromises = [
      // Xpressbees promise
      !carrierName || carrierName.toLowerCase() === "xpressbees"
        ? getXpressbeesCharges(
            originPincode,
            destinationPincode,
            chargeableWeight,
            CODAmount,
            normalizedProductType,
            height,
            breadth,
            length
          )
        : Promise.resolve(null),

      // Delhivery promise
      !carrierName || carrierName.toLowerCase() === "delhivery"
        ? getDelhiveryCharges(
            originPincode,
            destinationPincode,
            chargeableWeight,
            CODAmount,
            normalizedProductType
          )
        : Promise.resolve(null),

      // Ecom promise (handles both "ecom" and "ecom express")
      !carrierName ||
      ["ecom", "ecom express"].includes(carrierName.toLowerCase())
        ? getEcomCharges(
            originPincode,
            destinationPincode,
            chargeableWeight,
            CODAmount,
            normalizedProductType
          )
        : Promise.resolve(null),
    ];

    const [xpressbeesCharges, delhiveryCharges, ecomCharges] =
      await Promise.all(apiPromises);

    // Process Xpressbees charges
    if (xpressbeesCharges?.services) {
      const multiplier = getMultiplier("xpressbees");
      xpressbeesCharges.services.forEach((service) => {
        const baseCod = service.cod_charges || 0;
        const baseFreight = service.freight_charges || 0;
        const baseTotal = service.total_charges || 0;

        chargesBreakdown.push({
          carrierName: "Xpressbees",
          serviceType: service.name,
          totalPrice: baseTotal * multiplier,
          codCharge: baseCod * multiplier,
          freightCharge: baseFreight * multiplier,
          otherCharges: (baseTotal - baseCod - baseFreight) * multiplier,
        });
      });
    }

    // Process Delhivery charges
    if (delhiveryCharges?.services) {
      const multiplier = getMultiplier("delhivery");
      delhiveryCharges.services.forEach((service) => {
        const baseCod = service.cod_charge || 0;
        const baseFreight = service.freight_charge || 0;
        const baseTotal = service.total_charges || 0;

        chargesBreakdown.push({
          carrierName: "Delhivery",
          serviceType: service.name,
          totalPrice: baseTotal * multiplier,
          codCharge: baseCod * multiplier,
          freightCharge: baseFreight * multiplier,
          otherCharges: (baseTotal - baseCod - baseFreight) * multiplier,
        });
      });
    }

    // Process Ecom charges with enhanced logging
    // Process Ecom Express charges
    if (ecomCharges?.services) {
      const multiplier = getMultiplier("ecom");
      console.log(
        "Processing Ecom charges with multiplier:",
        multiplier,
        "for customer type:",
        customerType
      );

      ecomCharges.services.forEach((service) => {
        const baseTotal = service.total_charges || 0;
        const baseCod = service.cod_charge || 0;
        const baseFreight = service.freight_charge || 0;

        const charge = {
          carrierName: "Ecom",
          serviceType: service.name,
          totalPrice: baseTotal * multiplier,
          codCharge: baseCod * multiplier,
          freightCharge: baseFreight * multiplier,
          otherCharges: (baseTotal - baseCod - baseFreight) * multiplier,
        };

        console.log("Adding Ecom charge:", charge);
        chargesBreakdown.push(charge);
      });
    }

    // Filter by carrier if specified (case insensitive)
    if (carrierName) {
      const targetCarrier = carrierName.toLowerCase();
      chargesBreakdown = chargesBreakdown.filter(
        (charge) => charge.carrierName.toLowerCase() === targetCarrier
      );
    }

    console.log(
      "Final Charges Breakdown:",
      JSON.stringify(chargesBreakdown, null, 2)
    );

    res.json({
      message: "Charges calculated successfully.",
      charges: chargesBreakdown,
    });
  } catch (error) {
    console.error("Error calculating charges:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
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
    const multiplierMaps = {
      xpressbees: { bronze: 3, silver: 2.5, gold: 2.2, platinum: 2 },
      delhivery: { bronze: 2.5, silver: 2.3, gold: 2, platinum: 1.8 },
      ecom: { bronze: 2.5, silver: 2.3, gold: 2, platinum: 1.8 },
      default: { bronze: 2.5, silver: 2.3, gold: 2, platinum: 1.8 },
    };

    const getMultiplier = (carrier) => {
      const carrierKey = carrier.toLowerCase();
      return (
        multiplierMaps[carrierKey]?.[customerType] ||
        multiplierMaps.default[customerType] ||
        1
      );
    };

    let originPincode;
    if (pickUpWareHouse === "Ship Duniya") {
      originPincode = "201301";
    } else {
      if (!mongoose.Types.ObjectId.isValid(pickUpWareHouse)) {
        return res
          .status(400)
          .json({ message: "Invalid pickup warehouse ID." });
      }
      const warehouse = await Warehouse.findById(pickUpWareHouse);
      originPincode = warehouse?.pincode;
    }

    if (!originPincode) {
      return res
        .status(400)
        .json({ message: "Could not determine origin pincode." });
    }

    let requestedCarrier = carrierName?.toLowerCase().trim();
    if (requestedCarrier === "ecom express") {
      requestedCarrier = "ecom";
    }

    const uniqueServices = new Map();

    for (const orderId of orderIds) {
      const orderDetails = await fetchOrderDetails(orderId);
      if (!orderDetails) continue;

      const {
        chargeableWeight,
        CODAmount,
        productType,
        pincode: destinationPincode,
        height,
        breadth,
        length,
      } = orderDetails;

      if (!destinationPincode || isNaN(chargeableWeight)) continue;

      const carrierResponse = await getCarrierCharges(
        requestedCarrier,
        originPincode,
        destinationPincode,
        chargeableWeight,
        CODAmount,
        productType,
        height,
        breadth,
        length
      );

      if (carrierResponse?.services) {
        carrierResponse.services.forEach((service) => {
          const multiplier = getMultiplier(requestedCarrier);
          const baseTotal = service.total_charges || 0;
          const baseCod = service.cod_charge || 0;
          const baseFreight = service.freight_charge || 0;
          const otherCharges = baseTotal - baseCod - baseFreight;

          const totalPrice = baseTotal * multiplier;
          const codCharge = baseCod * multiplier;
          const freightCharge = baseFreight * multiplier;
          const otherChargesTotal = otherCharges * multiplier;

          const carrierNameFormatted =
            requestedCarrier.charAt(0).toUpperCase() + requestedCarrier.slice(1);
          const serviceKey = `${carrierNameFormatted}|${service.name}`;

          if (uniqueServices.has(serviceKey)) {
            // Accumulate charges for existing service
            const existing = uniqueServices.get(serviceKey);
            existing.totalPrice += totalPrice;
            existing.codCharge += codCharge;
            existing.freightCharge += freightCharge;
            existing.otherCharges += otherChargesTotal;
          } else {
            // Create new service entry
            uniqueServices.set(serviceKey, {
              carrierName: carrierNameFormatted,
              serviceType: service.name,
              totalPrice: totalPrice,
              codCharge: codCharge,
              freightCharge: freightCharge,
              otherCharges: otherChargesTotal,
            });
          }
        });
      }
    }

    const chargesBreakdown = Array.from(uniqueServices.values()).sort(
      (a, b) => a.totalPrice - b.totalPrice
    );

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

async function fetchOrderDetails(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return null;
  return {
    chargeableWeight:
      parseFloat(order.volumetricWeight) || parseFloat(order.actualWeight),
    CODAmount: parseFloat(order.collectableValue) || 0,
    pincode: order.pincode,
    productType: order.orderType.toLowerCase(),
    height: order.height,
    breadth: order.breadth,
    length: order.length,
  };
}

async function getCarrierCharges(
  carrier,
  origin,
  destination,
  weight,
  codAmount,
  productType,
  height,
  breadth,
  length
) {
  switch (carrier) {
    case "ecom":
      return getEcomCharges(origin, destination, weight, codAmount, productType);
    case "xpressbees":
      return getXpressbeesCharges(
        origin,
        destination,
        weight,
        codAmount,
        productType,
        height,
        breadth,
        length
      );
    case "delhivery":
      return getDelhiveryCharges(
        origin,
        destination,
        weight,
        codAmount,
        productType
      );
    default:
      return null;
  }
}

// Carrier API Helpers
async function getXpressbeesCharges(
  origin,
  destination,
  weight,
  codAmount,
  productType
) {
  try {
    const token = await getXpressbeesToken();
    const payload = {
      origin: origin.toString(),
      destination: destination.toString(),
      payment_type: productType === "cod" ? "cod" : "prepaid",
      weight: weight,
      length: 10,
      breadth: 10,
      height: 10,
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
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    return {
      services: response.data.data.map((service) => ({
        name: service.name,
        total_charges: service.total_charges,
        cod_charges: service.cod_charges,
        freight_charges: service.freight_charges,
      })),
    };
  } catch (error) {
    console.error("Xpressbees API error:", error.message);
    return null;
  }
}

async function getDelhiveryCharges(origin, destination, weight, codAmount, productType) {
  try {
    if (!origin || !destination) return null;
    if (isNaN(weight) || weight <= 0) return null;

    // Convert weight to grams as required by the API
    const weightInGrams = Math.round(weight);

    // Construct the API URLs for md=E and md=S
    const urlE = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=${destination}&o_pin=${origin}&cgm=${weightInGrams}&pt=${
      productType === "cod" ? "COD" : "Pre-paid"
    }&cod=${codAmount}`;

    const urlS = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=S&ss=Delivered&d_pin=${destination}&o_pin=${origin}&cgm=${weightInGrams}&pt=${
      productType === "cod" ? "COD" : "Pre-paid"
    }&cod=${codAmount}`;

    // Log the request URLs for debugging
    console.log("Delhivery API Request URLs:", { urlE, urlS });

    // Make both API requests in parallel
    const [responseE, responseS] = await Promise.all([
      axios.get(urlE, {
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }),
      axios.get(urlS, {
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }),
    ]);

    // Log the raw responses for debugging
    console.log("Delhivery API Response for md=E:", responseE.data);
    console.log("Delhivery API Response for md=S:", responseS.data);

    // Validate and process the responses
    const servicesE = responseE.data?.map((service) => ({
      name: service.service_type || "Delhivery Service (E)",
      total_charges: service.total_amount || 0,
      cod_charge: service.charge_COD || 0,
      freight_charge: service.charge_DL || 0,
    })) || [];

    const servicesS = responseS.data?.map((service) => ({
      name: service.service_type || "Delhivery Service (S)",
      total_charges: service.total_amount || 0,
      cod_charge: service.charge_COD || 0,
      freight_charge: service.charge_DL || 0,
    })) || [];

    // Combine the services from both responses
    const combinedServices = [...servicesE, ...servicesS];

    return {
      services: combinedServices,
    };
  } catch (error) {
    console.error("❌ Error fetching Delhivery charges:", error.message);
    console.error("❌ Error Details:", error.response?.data || error);
    return null;
  }
}

async function getEcomCharges(
  origin,
  destination,
  weight,
  codAmount,
  productType
) {
  try {
    // Convert weight to number and handle minimum weight
    const numericWeight = Math.max(0.5, parseFloat(weight / 1000));

    const payload = {
      orginPincode: origin.toString(), // Note the API's spelling
      destinationPincode: destination.toString(),
      productType: productType === "cod" ? "cod" : "ppd",
      chargeableWeight: numericWeight,
      codAmount: productType === "cod" ? parseFloat(codAmount) || 0 : 0,
    };

    const formData = new URLSearchParams();
    formData.append(
      "username",
      process.env.ECOM_USERID || "SHIPDARTLOGISTIC-BA333267"
    );
    formData.append("password", process.env.ECOM_PASSWORD || "3PIXOLLg3t");
    formData.append("json_input", JSON.stringify([payload]));

    console.log("Ecom API Request:", {
      url: "https://ratecard.ecomexpress.in/services/rateCalculatorAPI/",
      payload: payload,
    });

    const response = await axios.post(
      "https://ratecard.ecomexpress.in/services/rateCalculatorAPI/",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 100000,
      }
    );

    // Handle empty or invalid responses
    if (!Array.isArray(response.data) || response.data.length === 0) {
      console.error("Ecom API Error: Empty response array");
      return null;
    }

    const ecomData = response.data[0];

    if (!ecomData || ecomData.success === false) {
      const errorMsg = ecomData?.errors
        ? Array.isArray(ecomData.errors)
          ? ecomData.errors.join(", ")
          : ecomData.errors
        : "Unknown Ecom API error";
      console.error("Ecom API Error:", errorMsg);
      return null;
    }

    // Extract charges from response
    const charges = ecomData.chargesBreakup || {};
    const service = {
      name: "Ecom Express",
      total_charges: parseFloat(charges.total_charge) || 0,
      cod_charge: parseFloat(charges.COD) || 0,
      freight_charge: parseFloat(charges.FRT) || 0,
    };

    console.log("Ecom API Success:", service);
    return { services: [service] };
  } catch (error) {
    // Improved error logging
    const errorDetails = {
      message: error.message,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      },
      response: {
        status: error.response?.status,
        data: error.response?.data,
      },
    };
    console.error(
      "Ecom Express API Error Details:",
      JSON.stringify(errorDetails, null, 2)
    );
    return null;
  }
}

module.exports = {
  calculateCharges,
  calculateShippingCharges,
};
