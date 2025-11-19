import mongoose from 'mongoose';

const resourceRequestSchema = new mongoose.Schema({
  songTitle: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  resourceType: {
    type: String,
    enum: ['sheet_music', 'audio_soprano', 'audio_alto', 'audio_tenor', 'audio_bass', 'google_drive_link', 'youtube_link'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true,
    trim: true
  },
  fileType: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  cloudinaryPublicId: {
    type: String,
    default: null
  },
  visibility: {
    type: String,
    enum: ['all_members', 'admin_moderator_only'],
    default: 'all_members'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
resourceRequestSchema.index({ requestedBy: 1 });
resourceRequestSchema.index({ status: 1 });
resourceRequestSchema.index({ createdAt: -1 });

// Update timestamp
resourceRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('ResourceRequest', resourceRequestSchema);
