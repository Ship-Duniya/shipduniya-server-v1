const axios = require("axios");

/**
 * Fetches the XpressBees authentication token
 * @returns {Promise<string>} - The bearer token
 */
const getXpressbeesToken = async () => {
  try {
    const response = await axios.post(
      process.env.XPRESSBEES_AUTH_URL,
      {
        email: process.env.XPRESSBEES_EMAIL,
        password: process.env.XPRESSBEES_PASSWORD,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.data.status && response.data.data) {
      return response.data.data; // JWT Token
    } else {
      throw new Error("Authentication failed.");
    }
  } catch (error) {
    console.error("Xpressbees Authentication Error:", error.message);
    throw new Error("Failed to authenticate with Xpressbees.");
  }
};

/**
 * Function to get Delhivery token
 * @returns {string} - The Delhivery token
 */
const getDelhiveryToken = async () => {
  try {
    const response = await axios.post(
      "https://track.delhivery.com/api/v1/auth/token/",
      {
        username: process.env.DELHIVERY_USERNAME,
        password: process.env.DELHIVERY_PASSWORD,
      }
    );
    return response.data.token;
  } catch (error) {
    console.error("Error fetching Delhivery token:", error.message);
    throw new Error("Failed to fetch Delhivery token.");
  }
};

module.exports = {
  getXpressbeesToken,
  getDelhiveryToken,
};
