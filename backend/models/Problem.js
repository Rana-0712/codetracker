const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
  description: {
    type: String,
    default: '',
  },
  platform: {
    type: String,
    required: true,
    default: 'unknown',
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
  companies: [{
    type: String,
  }],
  tags: [{
    type: String,
  }],
  completed: {
    type: Boolean,
    default: false,
  },
  number: {
    type: String,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
  lastSolved: {
    type: Date
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
});

// Create compound indexes
problemSchema.index({ userId: 1, url: 1 }, { unique: true });
problemSchema.index({ userId: 1, topicId: 1 });
problemSchema.index({ userId: 1, completed: 1 });
problemSchema.index({ userId: 1, platform: 1 });
problemSchema.index({ userId: 1, difficulty: 1 });

module.exports = mongoose.model('Problem', problemSchema);