import mongoose, { Document, Schema } from 'mongoose';

export interface IProblem extends Document {
  title: string;
  url: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description?: string;
  platform: string;
  topicId: mongoose.Types.ObjectId;
  notes?: string;
  companies: string[];
  tags: string[];
  completed: boolean;
  number?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProblemSchema = new Schema<IProblem>({
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
    type: Schema.Types.ObjectId,
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
}, {
  timestamps: true,
});

// Create compound indexes
ProblemSchema.index({ userId: 1, url: 1 }, { unique: true });
ProblemSchema.index({ userId: 1, topicId: 1 });
ProblemSchema.index({ userId: 1, completed: 1 });

export default mongoose.models.Problem || mongoose.model<IProblem>('Problem', ProblemSchema);