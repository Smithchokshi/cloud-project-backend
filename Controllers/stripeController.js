const StripeRoute = require('stripe');
const orderModel = require('../Models/orderModel');
const messageModel = require('../Models/messageModel');

require('dotenv').config();

const stripe = StripeRoute(process.env.STRIPE_KEY);

const createOrder = async (req, res) => {
  try {
    const { customer, data } = req.body;
    console.log(req.body);
    const newOrder = new orderModel({
      userId: customer.metadata.userId,
      recipientId: customer.metadata.recipientId,
      orderId: data.customer,
      chatId: customer.metadata.chatId,
      amount: data.amount_total / 100,
      paymentStatus: data.paymentStatus,
    });

    const message = new messageModel({
      chatId: customer.metadata.chatId,
      senderId: customer.metadata.userId,
      content: `Payment of $${data.amount_total / 100} is successful`,
      isImage: false,
      isPayment: true,
    });

    await message.save();

    const savedOrder = await newOrder.save();

    global.io.emit('paymentSuccessful', savedOrder);
  } catch (e) {
    console.log(e);
  }
};

module.exports = { createOrder };
