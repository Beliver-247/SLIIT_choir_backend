import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one favorite per member per resource
favoriteSchema.index({ memberId: 1, resourceId: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);
