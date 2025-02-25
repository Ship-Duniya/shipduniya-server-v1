const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      // required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issueType: {
      type: String,
      enum: ["tech", "account", "shipment", "other"],
      required: true,
    },
    awbNumber: {
      type: String,
      required: function () {
        return this.type === "shipment"; // AWB number required for shipment tickets
      },
      validate: {
        validator: function (v) {
          return this.type !== "shipment" || /^[A-Za-z0-9]{10}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid AWB number.`,
      },
    },
    description: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    progress: {
      type: String,
      default: "Ticket created",
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ["user", "support"],
          required: true,
        },
        message: {
          type: String,
          required: true,
          maxlength: 1000,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    vendor: {
      type: String,
      enum: ["xpressbees", "delivery", "ecom"],
      required: false, // Vendor is optional initially
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ticket", ticketSchema);
