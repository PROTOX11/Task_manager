import mongoose from 'mongoose';

const panelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Panel name is required'],
    trim: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  color: {
    type: String,
    default: '#007bff'
  }
}, {
  timestamps: true
});

const Panel = mongoose.model('Panel', panelSchema);

export default Panel;
