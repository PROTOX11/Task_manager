import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  signup,
  signupAdmin,
  login,
  getProfile,
  updateProfile,
  getDevelopers,
  getAllUsers
} from '../controllers/auth.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation middleware
const validateSignup = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const validateAdminSignup = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('paymentStatus').equals('paid').withMessage('Completed payment is required'),
  body('paymentAmount').isFloat({ gt: 0 }).withMessage('Valid payment amount is required'),
  body('paymentReference').trim().notEmpty().withMessage('Payment reference is required'),
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public routes
router.post('/signup', validateSignup, handleValidationErrors, signup);
router.post('/signup/admin', validateAdminSignup, handleValidationErrors, signupAdmin);
router.post('/login', validateLogin, handleValidationErrors, login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/developers', authenticate, getDevelopers);
router.get('/users', authenticate, authorizeAdmin, getAllUsers);

export default router;
