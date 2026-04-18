import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const trialAdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'developer'],
  },
  isTrialAdmin: {
    type: Boolean,
    default: true
  },
  isPaidAdmin: {
    type: Boolean,
    default: false
  },
  trialExpiresAt: {
    type: Date,
    required: true
  },
  joinedProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'trial_admins'
});

trialAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

trialAdminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

trialAdminSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const TrialAdmin = mongoose.model('TrialAdmin', trialAdminSchema);
export default TrialAdmin;
