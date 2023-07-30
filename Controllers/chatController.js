const chatModel = require('../Models/chatModel');
const { ObjectId } = require('mongodb');
const userModel = require('../Models/userModel');

const createChat = async (req, res) => {
  try {
    const firstId = res.locals.user._id.toString();
    console.log('firstId', firstId);
    const { secondId } = req.body;

    const chat = await chatModel.findOne({
      members: { $all: [firstId, secondId] },
    });

    console.log('chat', chat);

    if (chat)
      return res.status(200).json({
        status: 200,
        chat,
        message: 'Success',
      });

    const newChat = new chatModel({
      members: [firstId, secondId],
    });

    const response = await newChat.save();

    await userModel.updateMany(
      { _id: { $in: [firstId, secondId] } },
      { $push: { chatId: response._id } },
      { new: true }
    );

    // await userModel.findOneAndUpdate({ _id: secondId }, { chatId: response._id }, { new: true });

    res.status(200).json({
      status: 200,
      chat: response,
      message: 'Success',
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: e,
    });
  }
};

const getUserChats = async (req, res) => {
  try {
    const userId = res.locals.user._id.toString();
    const userObjectId = new ObjectId(userId);

    const allChats = await chatModel.aggregate([
      {
        $match: {
          members: { $in: [userId] },
        },
      },
      {
        $unwind: '$members',
      },
      {
        $addFields: {
          memberId: { $toObjectId: '$members' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'memberId',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $group: {
          _id: '$_id',
          createdAt: { $first: '$createdAt' },
          members: { $push: '$members' },
          userDetails: { $push: { $arrayElemAt: ['$userDetails', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          chatId: '$_id',
          createdAt: 1,
          userDetails: {
            $filter: {
              input: '$userDetails',
              as: 'user',
              cond: { $ne: ['$$user._id', userObjectId] },
            },
          },
          members: '$members',
        },
      },
      {
        $project: {
          userDetails: {
            password: 0,
            token: 0,
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    res.status(200).json({
      status: 200,
      allChats,
      message: 'Success',
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: e,
    });
  }
};

const findChat = async (req, res) => {
  try {
    const firstId = res.locals.user._id.toString();
    const { secondId } = req.params;

    const chat = await chatModel.findOne({
      members: { $all: [firstId, secondId] },
    });

    res.status(200).json({
      status: 200,
      chat,
      message: 'Success',
    });
  } catch (e) {
    res.status(500).json({
      message: e,
    });
  }
};

module.exports = { createChat, getUserChats, findChat };
