import mongoose from 'mongoose';

const zentrixaChatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  mode: {
    type: String,
    enum: ['chat', 'command'],
    default: 'chat',
  },
  intent: {
    type: String,
    default: 'unknown',
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null,
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

zentrixaChatMessageSchema.index({ userId: 1, createdAt: -1 });

const ZentrixaChatMessage = mongoose.model('ZentrixaChatMessage', zentrixaChatMessageSchema);

export default ZentrixaChatMessage;
