import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  signup,
  getGoogleAuthConfig,
  googleAuth,
  sendSignupOtp,
  sendLoginOtp,
  verifySignupEmailOtp,
  verifySignupOtp,
  verifyLoginOtp,
  completeVerifiedSignup,
  signupAdmin,
  createAdminOrder,
  verifyAdminPayment,
  login,
  getProfile,
  updateProfile,
  getDevelopers,
  getAllUsers
} from '../controllers/auth.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

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

const validateSendSignupOtp = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const validateSendLoginOtp = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const validateVerifySignupOtp = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').optional({ nullable: true, checkFalsy: true }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid OTP is required'),
];

const validateVerifyLoginOtp = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid OTP is required'),
];

const validateVerifySignupEmailOtp = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid OTP is required'),
];

const validateCompleteVerifiedSignup = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('verificationToken').trim().notEmpty().withMessage('Verification token is required'),
];

const validateCreateAdminOrder = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
];

const validateVerifyAdminPayment = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('googleCredential')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Google credential must not be empty'),
  body('razorpayOrderId').trim().notEmpty().withMessage('Order ID is required'),
  body('razorpayPaymentId').trim().notEmpty().withMessage('Payment ID is required'),
  body('razorpaySignature').trim().notEmpty().withMessage('Payment signature is required'),
  body().custom((value, { req }) => {
    if (!req.body.password && !req.body.googleCredential) {
      throw new Error('Password or Google credential is required');
    }
    return true;
  }),
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const validateGoogleAuth = [
  body('credential').trim().notEmpty().withMessage('Google credential is required'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public routes
router.get('/google/config', getGoogleAuthConfig);
router.post('/google', validateGoogleAuth, handleValidationErrors, googleAuth);
router.post('/signup/send-otp', validateSendSignupOtp, handleValidationErrors, sendSignupOtp);
router.post('/login/send-otp', validateSendLoginOtp, handleValidationErrors, sendLoginOtp);
router.post('/signup/verify-email-otp', validateVerifySignupEmailOtp, handleValidationErrors, verifySignupEmailOtp);
router.post('/signup/verify-otp', validateVerifySignupOtp, handleValidationErrors, verifySignupOtp);
router.post('/login/verify-otp', validateVerifyLoginOtp, handleValidationErrors, verifyLoginOtp);
router.post('/signup/complete-verified', validateCompleteVerifiedSignup, handleValidationErrors, completeVerifiedSignup);
router.post('/signup', validateSignup, handleValidationErrors, signup);
router.post('/signup/admin', validateAdminSignup, handleValidationErrors, signupAdmin);
router.post('/signup/admin/order', validateCreateAdminOrder, handleValidationErrors, createAdminOrder);
router.post('/signup/admin/verify-payment', validateVerifyAdminPayment, handleValidationErrors, verifyAdminPayment);
router.post('/login', validateLogin, handleValidationErrors, login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, upload.single('avatar'), updateProfile);
router.get('/developers', authenticate, getDevelopers);
router.get('/users', authenticate, authorizeAdmin, getAllUsers);

export default router;
