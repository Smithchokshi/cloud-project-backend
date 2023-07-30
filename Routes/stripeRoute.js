const express = require('express');
const authMiddleware = require('../Middleware/authMiddleware');
const { createOrder } = require('../Controllers/stripeController');

const router = express.Router();

router.post('/create-order', createOrder);

module.exports = router;
