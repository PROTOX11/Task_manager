import User from '../models/User.js';
import AdminAccount from '../models/AdminAccount.js';
import { generateToken } from '../middleware/auth.middleware.js';
import mongoose from 'mongoose';

const ensureDatabaseConnection = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      message: 'Database unavailable. Check MongoDB connection and try again.',
    });
    return false;
  }

  return true;
};

// Register new user
export const signup = async (req, res) => {
  try {
    if (!ensureDatabaseConnection(res)) {
      return;
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: 'developer'
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Register new admin after payment
export const signupAdmin = async (req, res) => {
  try {
    if (!ensureDatabaseConnection(res)) {
      return;
    }

    const { name, email, password, paymentAmount, paymentReference, paymentStatus } = req.body;

    if (paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Admin signup requires a completed payment.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const adminUser = new User({
      name,
      email,
      password,
      role: 'admin',
    });

    await adminUser.save();

    try {
      const adminAccount = new AdminAccount({
        userId: adminUser._id,
        name,
        email,
        paymentAmount,
        paymentReference,
        paymentStatus,
      });

      await adminAccount.save();

      const token = generateToken(adminUser._id);

      res.status(201).json({
        message: 'Admin account created successfully',
        token,
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
        adminAccount: {
          paymentAmount: adminAccount.paymentAmount,
          paymentReference: adminAccount.paymentReference,
          paidAt: adminAccount.paidAt,
        },
      });
    } catch (adminAccountError) {
      await User.findByIdAndDelete(adminUser._id);
      throw adminAccountError;
    }
  } catch (error) {
    console.error('Admin signup error:', error);

    res.status(500).json({ message: 'Error registering admin', error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    if (!ensureDatabaseConnection(res)) {
      return;
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    if (!ensureDatabaseConnection(res)) {
      return;
    }

    const user = await User.findById(req.userId)
      .populate('joinedProjects', 'name description progress')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    if (!ensureDatabaseConnection(res)) {
      return;
    }

    const { name, email } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// Get all developers (for admin to invite)
export const getDevelopers = async (req, res) => {
  try {
    if (!ensureDatabaseConnection(res)) {
      return;
    }

    const developers = await User.find({ role: 'developer' })
      .select('name email joinedProjects')
      .populate('joinedProjects', 'name');

    res.json({ developers });
  } catch (error) {
    console.error('Get developers error:', error);
    res.status(500).json({ message: 'Error fetching developers', error: error.message });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    if (!ensureDatabaseConnection(res)) {
      return;
    }

    const users = await User.find()
      .select('-password')
      .populate('joinedProjects', 'name');

    res.json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};
