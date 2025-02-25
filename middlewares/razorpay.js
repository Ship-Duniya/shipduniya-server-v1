const Razorpay = require("razorpay");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
  const options = {
    amount: req.body.amount * 100, // Convert to paise
    currency: "INR",
    receipt: "receipt#1",
  };
  const order = await razorpayInstance.orders.create(options);
  res.send(order);
};

module.exports = { createOrder };
