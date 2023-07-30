const express = require('express');
const authMiddleware = require('../Middleware/authMiddleware');
const {
  registerUser,
  loginUser,
  getUserDetails,
  getAllUsers,
  updateProfileImage,
  updateProfileDetails,
  deleteUser,
  changePassword,
} = require('../Controllers/userController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authMiddleware, getUserDetails);
router.get('/', authMiddleware, getAllUsers);
router.patch('/my-profile/edit-profile/upload-Image', updateProfileImage);
router.patch('/my-profile/edit-profile/update-Details', updateProfileDetails);
router.delete('/my-profile/edit-profile/:id', deleteUser);
router.patch('/my-profile/edit-profile/change-password/:id', changePassword);

module.exports = router;
