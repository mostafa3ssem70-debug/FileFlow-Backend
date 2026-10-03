const express = require('express');
const router = express.Router();
const {
    loginUser,
    registerUser,
    getUsersByAdmin,
    getUsersByDepartment,
    updateUser,
    deleteUser,
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/users', protect, adminOnly, getUsersByAdmin);
router.get('/department-users', protect, getUsersByDepartment);
router.put('/users/:id', protect, adminOnly, updateUser);
router.delete('/users/:id', protect, adminOnly, deleteUser);

module.exports = router;