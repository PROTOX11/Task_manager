import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [2, 'Project name must be at least 2 characters']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  githubRepository: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Additional admins who have full control over this project
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  developers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  panels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Panel'
  }],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived', 'starred'],
    default: 'active'
  },
  totalTasks: {
    type: Number,
    default: 0
  },
  completedTasks: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for pending tasks
projectSchema.virtual('pendingTasks').get(function() {
  return this.totalTasks - this.completedTasks;
});

// Method to update progress
projectSchema.methods.updateProgress = function() {
  if (this.totalTasks === 0) {
    this.progress = 0;
  } else {
    this.progress = Math.round((this.completedTasks / this.totalTasks) * 100);
  }
  return this.save();
};

// Ensure virtuals are included in JSON
projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;
