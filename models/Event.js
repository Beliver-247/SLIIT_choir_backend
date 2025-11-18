import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['performance', 'practice', 'charity', 'competition', 'other'],
    default: 'performance'
  },
  image: {
    type: String,
    default: null
  },
  capacity: {
    type: Number,
    default: null
  },
  registrations: [{
    memberId: mongoose.Schema.Types.ObjectId,
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'cancelled'],
      default: 'registered'
    }
  }],
  attendance: [{
    memberId: mongoose.Schema.Types.ObjectId,
    status: {
      type: String,
      enum: ['present', 'absent', 'excused', 'late'],
      default: 'absent'
    },
    markedAt: {
      type: Date,
      default: Date.now
    },
    markedBy: mongoose.Schema.Types.ObjectId
  }],
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
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

export default mongoose.model('Event', eventSchema);
