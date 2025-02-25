// partnerChargeService.js
require("dotenv").config();
const axios = require("axios");

// Service configurations
const serviceConfig = {
  xpressbees: {
    loginUrl: "https://shipment.xpressbees.com/api/users/login",
    partnerUrl: "https://shipment.xpressbees.com/api/courier/serviceability",
    credentials: {
      email: process.env.XPRESSBEES_EMAIL,
      password: process.env.XPRESSBEES_PASSWORD,
    },
  },
  // Other services (ecom, delivery) can be added similarly
};

/**
 * Fetch partner data for a specific service.
 * @param {Object} config - Service configuration object.
 * @returns {Array} - List of partners.
 */
const fetchServicePartners = async (config) => {
  // Step 1: Login to get the token
  const loginResponse = await axios.post(config.loginUrl, config.credentials);

  if (!loginResponse.data.status) {
    throw new Error("Login failed for a service");
  }

  const token = loginResponse.data.data;

  // Step 2: Fetch serviceability list
  const serviceabilityResponse = await axios.get(config.partnerUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!serviceabilityResponse.data.status) {
    throw new Error("Failed to fetch serviceability data for a service");
  }

  return serviceabilityResponse.data.data;
};

/**
 * Fetch partner data for all services.
 * @returns {Object} - Combined partner data from all services.
 */
const fetchAllPartnerData = async () => {
  const services = Object.keys(serviceConfig);
  const allPartners = {};

  for (const service of services) {
    try {
      const partners = await fetchServicePartners(serviceConfig[service]);
      allPartners[service] = partners;
    } catch (error) {
      console.error(
        `Error fetching partners for service '${service}':`,
        error.message
      );
      allPartners[service] = { error: error.message };
    }
  }

  return allPartners;
};

module.exports = { fetchAllPartnerData };
