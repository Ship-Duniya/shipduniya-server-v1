// partnerController.js
const { fetchAllPartnerData } = require("../services/partnerService");
const chargeSheet = require("../chargesSheet"); // Assuming chargeSheet is a data file

/**
 * Fetch all partners and calculate charges for each partner for the given orders.
 * @param {Object} req - The request object containing userId and orderIds.
 * @param {Object} res - The response object.
 */
const fetchAllPartners = async (req, res) => {
  const userId = req.user.id;
  const { orderIds } = req.body;
  if (!userId || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Missing required parameters (userId or orderIds)" });
  }

  try {
    // Fetch customerType from the user data
    const customerType = await getCustomerType(userId); // Define this logic based on your DB

    // Fetch all order details (cod and freight for each order)
    const orderDetails = await getOrderDetails(orderIds); // Get details for each order based on orderIds

    // Fetch partner data from all services
    const allPartners = await fetchAllPartnerData();

    // Initialize an object to store total charges for each partner
    const partnerTotalCharges = {};

    // Loop through each order and calculate charges for each partner
    orderDetails.forEach((order) => {
      const { cod, freight } = order;

      // Loop through each partner data for each service
      for (const [service, partners] of Object.entries(allPartners)) {
        if (partners.error) {
          console.error(
            `Skipping service "${service}" due to error: ${partners.error}`
          );
          continue;
        }

        // Loop through each partner in the service
        partners.forEach((partner) => {
          const totalCharges = getCharges(
            customerType,
            partner.name,
            cod,
            freight
          );
          if (totalCharges !== null) {
            // Sum up the charges for each partner (group by partnerId)
            if (partnerTotalCharges[partner.id]) {
              partnerTotalCharges[partner.id].totalCharge += totalCharges;
            } else {
              partnerTotalCharges[partner.id] = {
                partnerName: partner.name,
                partnerId: partner.id,
                totalCharge: totalCharges,
              };
            }
          }
        });
      }
    });

    // Convert the partnerTotalCharges object to an array and send as the response
    const result = Object.values(partnerTotalCharges);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching partner charges:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get customerType for a given userId.
 * @param {string} userId - The ID of the user.
 * @returns {string} - The customerType of the user.
 */
const getCustomerType = async (userId) => {
  // Fetch customer type from the user data (e.g., from a database)
  const user = await getUserById(userId); // Define this logic based on your DB
  return user.customerType;
};

/**
 * Get order details (cod and freight) for the given array of orderIds.
 * @param {Array<string>} orderIds - Array of orderIds.
 * @returns {Array<Object>} - Array of order details, each containing cod and freight.
 */
const getOrderDetails = async (orderIds) => {
  const orders = await getOrdersByIds(orderIds); // Define this logic based on your DB
  return orders.map((order) => ({
    cod: order.cod,
    freight: order.freight,
  }));
};

module.exports = { fetchAllPartners };
