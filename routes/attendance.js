import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  markAttendance,
  getAttendance,
  getEventAttendance,
  getScheduleAttendance,
  updateAttendance,
  deleteAttendance,
  exportAttendanceToExcel,
  getAttendanceAnalytics,
  getMemberAttendanceHistory
} from '../controllers/attendanceController.js';

const router = express.Router();

// Mark attendance (moderator/admin only)
router.post('/mark', authenticate, authorize('moderator', 'admin'), markAttendance);

// Get all attendance records (with filtering)
router.get('/list', authenticate, authorize('moderator', 'admin'), getAttendance);

// Get attendance for a specific event
router.get('/event/:eventId', authenticate, authorize('moderator', 'admin'), getEventAttendance);

// Get attendance for a specific practice schedule
router.get('/schedule/:scheduleId', authenticate, authorize('moderator', 'admin'), getScheduleAttendance);

// Get attendance analytics
router.get('/analytics', authenticate, authorize('moderator', 'admin'), getAttendanceAnalytics);

// Get member attendance history
router.get('/member/:memberId', authenticate, getMemberAttendanceHistory);

// Update attendance record
router.put('/:id', authenticate, authorize('moderator', 'admin'), updateAttendance);

// Delete attendance record
router.delete('/:id', authenticate, authorize('moderator', 'admin'), deleteAttendance);

// Export attendance to Excel
router.get('/export/excel', authenticate, authorize('moderator', 'admin'), exportAttendanceToExcel);

export default router;
