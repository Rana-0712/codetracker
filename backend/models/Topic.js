const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
  },
  description: {
    type: String,
    default: '',
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  color: {
    type: String,
    default: '#059669'
  },
  icon: {
    type: String,
    default: '📚'
  }
}, {
  timestamps: true,
});

// Create compound index for user-specific topics
topicSchema.index({ userId: 1, slug: 1 }, { unique: true });
topicSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Topic', topicSchema);