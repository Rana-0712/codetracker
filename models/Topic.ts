import mongoose, { Document, Schema } from 'mongoose';

export interface ITopic extends Document {
  name: string;
  slug: string;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema = new Schema<ITopic>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
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
}, {
  timestamps: true,
});

// Create compound index for user-specific topics
TopicSchema.index({ userId: 1, slug: 1 }, { unique: true });

export default mongoose.models.Topic || mongoose.model<ITopic>('Topic', TopicSchema);