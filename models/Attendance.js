import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PracticeSchedule',
    default: null
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'excused', 'late'],
    default: 'absent'
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  comments: {
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

// Index for faster queries
attendanceSchema.index({ eventId: 1, memberId: 1 });
attendanceSchema.index({ scheduleId: 1, memberId: 1 });
attendanceSchema.index({ memberId: 1 });
attendanceSchema.index({ markedAt: 1 });

export default mongoose.model('Attendance', attendanceSchema);
