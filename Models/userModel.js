const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minLength: 3, maxLength: 30 },
    email: { type: String, required: false, unique: true },
    img: { type: String, required: false },
    password: { type: String, required: false },
    token: { type: String, required: false },
    postalCode: { type: String, required: true },
    deletedAt: { type: Date, default: null },
    chatId: { type: Array, required: false },
  },
  {
    timestamps: true,
  }
);

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;
