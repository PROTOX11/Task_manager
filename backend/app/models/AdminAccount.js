import mongoose from 'mongoose';

const adminAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  paymentStatus: {
    type: String,
    enum: ['paid'],
    default: 'paid',
  },
  paymentAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentReference: {
    type: String,
    required: true,
    trim: true,
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'admins',
});

const AdminAccount = mongoose.model('AdminAccount', adminAccountSchema);

export default AdminAccount;
