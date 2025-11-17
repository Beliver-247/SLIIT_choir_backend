import mongoose from 'mongoose';

const practiceScheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: null,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  timePeriod: {
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    }
  },
  location: {
    lectureHallId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    }
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  attendance: [{
    memberId: mongoose.Schema.Types.ObjectId,
    markedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'excused'],
      default: 'absent'
    }
  }],
  notes: {
    type: String,
    default: null
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

export default mongoose.model('PracticeSchedule', practiceScheduleSchema);
