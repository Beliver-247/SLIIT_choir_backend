import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
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
    type: String, // e.g., 'pdf', 'jpg', 'png', 'mp3', 'wav', 'link'
    default: null
  },
  fileSize: {
    type: Number, // in bytes
    default: null
  },
  cloudinaryPublicId: {
    type: String, // for deletion purposes
    default: null
  },
  visibility: {
    type: String,
    enum: ['all_members', 'admin_moderator_only'],
    default: 'all_members'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
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
resourceSchema.index({ songTitle: 1 });
resourceSchema.index({ resourceType: 1 });
resourceSchema.index({ visibility: 1 });
resourceSchema.index({ status: 1 });
resourceSchema.index({ createdAt: -1 });

// Text search index
resourceSchema.index({ songTitle: 'text', description: 'text' });

// Update timestamp
resourceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Resource', resourceSchema);
