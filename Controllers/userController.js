const userModel = require('../Models/userModel');
const bcrypt = require('bcrypt');
const validator = require('validator');
const AWS = require('aws-sdk');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const generateToken = _id => {
  const jwtKey = process.env.JWT_SECRET_KEY;

  return jwt.sign({ _id }, jwtKey, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, postalCode, password } = req.body;

    let user = await userModel.findOne({ email });

    if (user)
      return res.status(400).json({
        status: '400',
        message: 'User with the given email already exists.',
      });

    if (!name || !email || !postalCode || !password)
      return res.status(400).json({
        status: '400',
        message: 'All fields are required.',
      });

    if (!validator.isEmail(email))
      return res.status(400).json({
        status: '400',
        message: 'Please enter valid email.',
      });

    user = new userModel({ name, email, postalCode, password });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    await user.save();

    const token = generateToken(user._id);

    user = await userModel.findOneAndUpdate({ _id: user._id }, { token: token }, { new: true });

    res.status(200).json({
      message: 'Registered successfully',
      userData: user,
    });
  } catch (e) {
    console.log('error', e);
    res.status(500).json({
      message: e,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await userModel.findOne({ email });

    if (!user)
      return res.status(400).json({
        status: '400',
        message: 'Invalid email or password.',
      });

    if (user.deletedAt !== null) {
      return res.status(400).json({
        status: '400',
        message: 'This account has been deleted.',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword)
      return res.status(400).json({
        status: '400',
        message: 'Invalid email or password.',
      });

    const token = generateToken(user._id);

    user = await userModel.findOneAndUpdate({ _id: user._id }, { token: token }, { new: true });

    res.status(200).json({
      message: 'Login successfully',
      userData: {
        _id: user._id,
        token,
      },
    });
  } catch (e) {
    res.status(500).json({
      message: e,
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const { user } = res.locals;

    res.status(200).json({
      message: 'successful',
      userData: user,
    });
  } catch (e) {
    res.status(500).json({
      message: e,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { user } = res.locals;

    const users = await userModel.find({
      _id: { $ne: user },
    });

    res.status(200).json({
      message: 'successful',
      userData: users,
    });
  } catch (e) {
    res.status(500).json({
      message: e,
    });
  }
};

const changePasswordGet = async (req, res) => {
  const { id, token } = req.params;
  const oldUser = await userModel.findOne({ _id: id, verifyToken: token });
  if (!oldUser) {
    return res.status(400).json({ status: 'User Not Exists!!' });
  }
  const secret = process.env.JWT_SECRET + oldUser.password;
  try {
    const verify = jwt.verify(token, secret);
    res.status(200).json({ email: verify.email, status: 'Not Verified' });
  } catch (error) {
    res.status(500).json({ status: 'Something went wrong' });
  }
};

const changePasswordPost = async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  const oldUser = await userModel.findOne({ _id: id, verifyToken: token });
  if (!oldUser) {
    return res.json({ status: 'User Not Exists!!' });
  }

  const secret = process.env.JWT_SECRET + oldUser.password;
  const verify = jwt.verify(token, secret);
  try {
    const salt = await bcrypt.genSalt(10);
    const newpassword = await bcrypt.hash(password, salt);

    const setnewuserpass = await userModel.findByIdAndUpdate(
      { _id: id },
      { password: newpassword }
    );

    setnewuserpass.save();
    res.status(201).json({ status: 201, email: verify.email });
  } catch (error) {
    res.status(401).json({ status: 401, error });
  }
};

const updateProfileImage = async (req, res) => {
  const { image, email, name, type } = req.body;

  try {
    AWS.config.update({
      region: 'us-east-1',
    });

    const s3 = new AWS.S3({
      accessKeyId: 'ASIA2AOKCJAQ2NCOOOFD',
      secretAccessKey: 'QS6QZoDebDnL6BfDfhaL+mZ1MkV0232gQuLBHuOc',
      sessionToken:
        'FwoGZXIvYXdzEEMaDIQi4pl0PbWVhArxoiLHAaz3IeOFZhq6vduKtXnscN78Nrxy2mcfcwRhX/S18IXettSx4dBHJct/TKPN35LtoUxcICJy9SiNRKr70ouclL+kTQL4y5DbW+dFnAtTjVoWrU2RiFDLWfe4F4hvX3ZGZtV0n3lHaIINAJpHuTpuIsVjQo7ethFeZ6yPW8OsQJsQqfaZzSh9ItbxBPf/IUxBJlhhLw9jXZRHbDhMQnxkoq7WYPBrmv7k0M8XTTF5g0V9GJHu8HiUO5HmGCGoHdtae8u8pTg01oEojsmhpgYyLSf7iPwVRI2PhO+Yh80YfUW2GAldY3iHCFoHn2A4CddDacAG1aC+aGU22gd4jg==',
    });

    const oldUser = await userModel.findOne({ email });
    if (!oldUser) {
      return res.json({ status: 'User Not Exists!!' });
    }

    if (!image) {
      return res.status(400).json({ msg: 'Please enter an icon url' });
    }

    const imageBuffer = new Buffer.from(image, 'base64');

    const contentType = image.match(/data:(.*);/)[1];
    console.log(type);

    const params = {
      Bucket: 'cloudchatapp1',
      Key: `${email}/${name}`,
      Body: imageBuffer,
      // ACL: 'public-read',
      ContentType: contentType,
    };

    const result = await s3.upload(params).promise();

    console.log('s3', result.Location);

    const setImage = await userModel.findByIdAndUpdate({ _id: oldUser._id }, { img: image });

    setImage.save();
    res.status(201).json({ status: 201, img: result.Location });
  } catch (error) {
    res.status(500).json({ status: 500, error });
  }
};

const updateProfileDetails = async (req, res) => {
  const { email, name, city, postalCode, mobile } = req.body;

  try {
    const oldUser = await userModel.findOne({ email });
    if (!oldUser) {
      return res.json({ status: 'User Not Exists!!' });
    }

    if (!name || !email || !postalCode || !city || !mobile) {
      return res.status(400).json({
        status: '400',
        message: 'All fields are required.',
      });
    }

    const setDetails = await userModel.findByIdAndUpdate(
      oldUser._id,
      {
        name: name,
        postalCode: postalCode,
        city: city,
        mobile: mobile,
      },
      { new: true }
    );

    setDetails.save();
    res.status(200).json({
      message: 'Profile Updated successfully',
      userData: setDetails,
    });
  } catch (error) {
    res.status(401).json({ status: 401, error });
  }
};
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the user by ID
    const oldUser = await userModel.findById(id);

    console.log(oldUser);
    // Check if the user exists
    if (!oldUser) {
      return res.status(404).json({
        status: '404',
        message: 'User not found.',
      });
    }

    // Update the deletedAt field with the current date
    oldUser.deletedAt = new Date();

    console.log(oldUser);
    await oldUser.save();

    return res.status(200).json({
      status: '200',
      message: 'User successfully deleted.',
    });
  } catch (e) {
    res.status(500).json({
      status: '500',
      message: e.message || 'An error occurred while deleting the user.',
    });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const { id } = req.params;
  console.log(req.body);
  console.log(id);
  try {
    const oldUser = await userModel.findById(id);
    if (!oldUser) {
      return res.json({ status: 'User Not Exists!!' });
    }
    console.log(oldUser);
    const isOldPasswordCorrect = await bcrypt.compare(oldPassword, oldUser.password);

    console.log(isOldPasswordCorrect);
    if (!isOldPasswordCorrect) {
      console.log('in oldcorrect');
      return res.status(400).json({
        status: '400',
        message: 'Old Password Does Not Match',
      });
    }

    const isNewPasswordSame = await bcrypt.compare(newPassword, oldUser.password);
    console.log(isNewPasswordSame);
    if (isNewPasswordSame) {
      return res.status(400).json({
        status: '400',
        message: 'Your Current Password and New Password is Same',
      });
    }

    const salt = await bcrypt.genSalt(10);
    oldUser.password = await bcrypt.hash(newPassword, salt);

    await oldUser.save();
    res.status(200).json({
      status: '200',
      message: 'Password Changed Sucessfully',
    });
  } catch (error) {
    res.status(401).json({ status: 401, error });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserDetails,
  getAllUsers,
  changePasswordGet,
  changePasswordPost,
  updateProfileImage,
  updateProfileDetails,
  deleteUser,
  changePassword,
};
