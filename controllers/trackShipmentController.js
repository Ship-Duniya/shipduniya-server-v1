const axios = require("axios");

/**
 * Function to determine the courier based on AWB format
 * @param {string} awb - The AWB number
 * @returns {string} - The courier service ('xpressbees' or 'ecom')
 */
const determineCourier = (awb) => {
  if (awb.length >= 14) {
    return "xpressbees"; // Example for Xpressbees AWB format
  } else if (awb.length === 9 || 10 || 11) {
    return "ecom"; // Example for Ecom AWB format
  } else {
    throw new Error("Unable to determine courier for this AWB.");
  }
};

/**
 * Function to log in to Xpressbees and get a Bearer Token
 * @returns {Promise<string>} - Bearer token
 */
const getXpressbeesToken = async () => {
  try {
    const response = await axios.post(process.env.XPRESSBEES_AUTH_URL, {
      email: process.env.XPRESSBEES_EMAIL,
      password: process.env.XPRESSBEES_PASSWORD,
    });
    const token = response.data;
    return token.data;
  } catch (error) {
    console.error("Error fetching Xpressbees token:", error.message);
    throw new Error("Failed to authenticate with Xpressbees.");
  }
};

/**
 * Function to fetch shipment tracking details
 * @param {string} courier - The courier service ('xpressbees' or 'ecom')
 * @param {string} awb - The AWB number
 * @returns {Promise<object>} - Tracking details
 */
const fetchTrackingDetails = async (courier, awb) => {
  try {
    if (courier === "xpressbees") {
      const token = await getXpressbeesToken();
      const response = await axios.get(
        `https://shipment.xpressbees.com/api/shipments2/track/${awb}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } else if (courier === "ecom") {
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
      return response.data;
    } else {
      throw new Error("Unsupported courier service.");
    }
  } catch (error) {
    console.error("Error fetching tracking details:", error.message);
    throw new Error("Failed to fetch tracking details.");
  }
};

/**
 * Controller to track shipment by AWB
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const trackShipment = async (req, res) => {
  const { awb } = req.params;
  console.log("AWB:", awb); // Log the AWB number for debugging

  try {
    const courier = determineCourier(awb); // Automatically determine courier
    const trackingDetails = await fetchTrackingDetails(courier, awb);
    res.json(trackingDetails); // Send the tracking details as response
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  trackShipment,
};
