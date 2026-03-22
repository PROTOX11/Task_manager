import mongoose from 'mongoose';

const projectRequestSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  developerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate requests
projectRequestSchema.index({ projectId: 1, developerId: 1 }, { unique: true });

const ProjectRequest = mongoose.model('ProjectRequest', projectRequestSchema);

export default ProjectRequest;
