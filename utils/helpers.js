const axios = require("axios");
const Ticket = require("../models/Ticket");
const crypto = require("crypto");
const FormData = require("form-data");

const generateId = (role) => {
  const prefix = role === "admin" ? "ADM" : role === "support" ? "SUP" : "USR";
  const randomId = Math.floor(Math.random() * 1000000); // Generates a random number between 0 and 999999
  return `${prefix}-${randomId}`; // Combines the prefix and random number
};

async function generateTicketId() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  while (true) {
    // Generate a secure random buffer
    const randomBytes = crypto.randomBytes(4); // 4 bytes (32 bits)

    // Convert bytes to characters
    let ticketId = "";
    for (let i = 0; i < 4; i++) {
      ticketId += letters[randomBytes[i] % letters.length];
    }
    for (let i = 0; i < 4; i++) {
      ticketId += numbers[randomBytes[i] % numbers.length];
    }

    // Check if this ticketId already exists
    const existingTicket = await Ticket.findOne({ ticketId });
    if (!existingTicket) {
      return ticketId; // Return only if unique
    }

    console.warn(`Duplicate Ticket ID ${ticketId} found. Regenerating...`);
  }
}

async function generateAWB() {
  try {
    const awbData = new FormData();
    awbData.append("username", "internaltest_staging");
    awbData.append("password", "@^2%d@xhH^=9xK4U");
    awbData.append("count", "1");
    awbData.append("type", "PREPAID");

    const awbResponse = await axios.post(
      "https://clbeta.ecomexpress.in/services/shipment/products/v2/fetch_awb/",
      awbData,
      {
        headers: awbData.getHeaders(),
        maxBodyLength: Infinity,
      }
    );

    console.log({ response: awbResponse.data });

    const awbNumber = awbResponse.data?.awb?.[0]; // Adjust according to the response structure

    if (!awbNumber) {
      throw new Error("Failed to fetch AWB number");
    }

    return awbNumber;
  } catch (error) {
    // console.error('Error generating AWB:', error);
    console.log(error);
    throw error;
  }
}

module.exports = { generateId, generateTicketId, generateAWB };
