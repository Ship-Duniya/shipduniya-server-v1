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

async function calculateShippingCharges(req, res) {
  const { orderIds, pickUpWareHouse, returnWarehouse, carrierName } = req.body;

  try {
    const userId = req.user.id;
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get customer type and multiplier
    const customerType = userProfile.customerType.toLowerCase();
    const multiplierMap = {
      bronze: 2.5,
      silver: 2.3,
      gold: 2,
      platinum: 1.8,
    };
    const multiplier = multiplierMap[customerType] || 1;

    // Get partner charges
    const partnerCharges = chargeSheet.find(
      (sheet) => sheet.customerType.toLowerCase() === customerType
    )?.deliveryPartners;

    if (!partnerCharges) {
      return res
        .status(400)
        .json({ message: "Customer type not found in charge sheet." });
    }

    // Process carrier name
    const requestedCarrier = carrierName.toLowerCase().trim();

    // Find matching carrier configuration (case-insensitive partial match)
    const carrierConfig = partnerCharges.find((partner) =>
      partner.carrierName.toLowerCase().includes(requestedCarrier)
    );

    if (!carrierConfig) {
      return res.status(400).json({ message: "Invalid carrier specified." });
    }

    // Get origin pincode
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

    // Process all orders
    const uniqueServices = new Map();

    for (const orderId of orderIds) {
      const orderDetails = await fetchOrderDetails(orderId);
      if (!orderDetails) continue;

      // Extract order details
      const {
        chargeableWeight,
        CODAmount,
        productType,
        pincode: destinationPincode,
      } = orderDetails;

      // Validate required fields
      if (!destinationPincode || isNaN(chargeableWeight)) {
        console.error("❌ Missing destination pincode or invalid weight");
        continue;
      }

      // Get carrier charges
      const carrierResponse = await getCarrierCharges(
        requestedCarrier,
        originPincode,
        destinationPincode,
        chargeableWeight,
        CODAmount,
        productType
      );

      // Process services
      if (carrierResponse?.services) {
        carrierResponse.services.forEach((service) => {
          const serviceKey = `${service.name}|${service.total_charges}`;
          if (!uniqueServices.has(serviceKey)) {
            uniqueServices.set(serviceKey, {
              carrierName: carrierConfig.carrierName,
              serviceType: service.name,
              totalPrice: (service.total_charges || 0) * multiplier,
            });
          }
        });
      }
    }

    // Convert to array and sort by price
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
    CODAmount: order.collectableValue,
    pincode: order.pincode,
    productType: order.type,
  };
}

// Unified carrier charge fetcher
async function getCarrierCharges(
  carrier,
  origin,
  destination,
  weight,
  codAmount,
  productType
) {
  switch (carrier) {
    case "ecom":
      return getEcomCharges(
        origin,
        destination,
        weight,
        codAmount,
        productType
      );
    case "xpressbees":
      return getXpressbeesCharges(
        origin,
        destination,
        weight,
        codAmount,
        productType
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

// Updated Delhivery handler
async function getDelhiveryCharges(
  origin,
  destination,
  weight,
  codAmount,
  productType
) {
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

    // Add service type differentiation
    return {
      services: response.data.map((service, index) => ({
        name: service.service_type
          ? `${service.service_type} Service`
          : `Delhivery Service ${index + 1}`,
        total_charges: service.total_amount || 0,
      })),
    };
  } catch (error) {
    console.error("❌ Error fetching Delhivery charges:", error.message);
    return null;
  }
}

// Updated Xpressbees handler
async function getXpressbeesCharges(
  origin,
  destination,
  weight,
  codAmount,
  productType
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
      length: "10",
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
      timeout: 5000,
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
      })),
    };
  } catch (error) {
    console.error("❌ Error fetching Xpressbees charges:", error.message);
    return null;
  }
}

// Updated Ecom handler
async function getEcomCharges(
  origin,
  destination,
  weight,
  codAmount,
  productType
) {
  try {
    if (!origin || !destination) {
          console.error("❌ Error: Origin or Destination Pincode is missing!");
          return null;
        }
    
        if (isNaN(weight) || weight <= 0) {
          console.error("❌ Error: Invalid Chargeable Weight:", weight);
          return null;
        }
    
        productType = (productType || "ppd").toLowerCase();
    
        const codAmountValue = productType === "cod" ? codAmount : 0;
    
        const payload = {
          orginPincode: origin,
          destinationPincode: destination,
          productType: productType,
          chargeableWeight: Math.max(1, weight),
          codAmount: codAmountValue,
        };
    
        const requestBody = new URLSearchParams({
          username: encodeURIComponent(process.env.ECOM_USERID),
          password: encodeURIComponent(process.env.ECOM_PASSWORD),
          json_input: JSON.stringify([payload]),
        });
    
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
    

    return {
      services: [
        {
          name: ecomData.service_name || "Ecom Standard Service",
          total_charges: ecomData.total || 0,
        },
      ],
    };
  } catch (error) {
    console.error("❌ Error fetching Ecom charges:", error.message);
    return null;
  }
}


module.exports = {
  calculateCharges,
  calculateShippingCharges,
};
