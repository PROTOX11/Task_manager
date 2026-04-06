import mongoose from 'mongoose';

const projectChatMessageSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

projectChatMessageSchema.index({ projectId: 1, recipientId: 1, createdAt: -1 });

const ProjectChatMessage = mongoose.model('ProjectChatMessage', projectChatMessageSchema);

export default ProjectChatMessage;
