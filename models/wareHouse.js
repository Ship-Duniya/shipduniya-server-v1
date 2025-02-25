const mongoose = require("mongoose");

// Warehouse schema
const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
      match: /^[1-9][0-9]{5}$/,
    },
    capacity: {
      type: Number,
    },
    managerName: {
      type: String,
    },
    managerMobile: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create and export the Warehouse model
module.exports = mongoose.model("Warehouse", warehouseSchema);
