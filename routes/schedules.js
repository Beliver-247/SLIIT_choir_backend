import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import PracticeSchedule from '../models/PracticeSchedule.js';

const router = express.Router();

// Create practice schedule (moderator/admin only)
router.post('/', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const { title, description, date, timePeriod, location } = req.body;

    // Validate required fields
    if (!title || !date || !timePeriod?.startTime || !timePeriod?.endTime || !location?.lectureHallId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, date, timePeriod (startTime, endTime), and location (lectureHallId)'
      });
    }

    // Validate time period
    if (timePeriod.startTime >= timePeriod.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }

    const practiceSchedule = new PracticeSchedule({
      title,
      description: description || null,
      date: new Date(date),
      timePeriod: {
        startTime: timePeriod.startTime,
        endTime: timePeriod.endTime
      },
      location: {
        lectureHallId: location.lectureHallId.toUpperCase()
      },
      createdBy: req.user.id,
      status: 'upcoming'
    });

    await practiceSchedule.save();
    await practiceSchedule.populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: practiceSchedule,
      message: 'Practice schedule created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all practice schedules
router.get('/', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    let query = {};

    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const schedules = await PracticeSchedule.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ date: 1 });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get practice schedule by ID
router.get('/:id', async (req, res) => {
  try {
    const schedule = await PracticeSchedule.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('attendance.memberId', 'firstName lastName email');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Practice schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update practice schedule (moderator/admin only)
router.put('/:id', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const { title, description, date, timePeriod, location, status, notes } = req.body;

    const schedule = await PracticeSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Practice schedule not found'
      });
    }

    // Update fields if provided
    if (title) schedule.title = title;
    if (description !== undefined) schedule.description = description;
    if (date) schedule.date = new Date(date);
    if (timePeriod) {
      if (timePeriod.startTime && timePeriod.endTime) {
        if (timePeriod.startTime >= timePeriod.endTime) {
          return res.status(400).json({
            success: false,
            message: 'Start time must be before end time'
          });
        }
        schedule.timePeriod = {
          startTime: timePeriod.startTime,
          endTime: timePeriod.endTime
        };
      }
    }
    if (location?.lectureHallId) {
      schedule.location.lectureHallId = location.lectureHallId.toUpperCase();
    }
    if (status) schedule.status = status;
    if (notes !== undefined) schedule.notes = notes;

    schedule.updatedAt = new Date();
    await schedule.save();
    await schedule.populate('createdBy', 'firstName lastName email');

    res.json({
      success: true,
      data: schedule,
      message: 'Practice schedule updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete practice schedule (moderator/admin only)
router.delete('/:id', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const schedule = await PracticeSchedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Practice schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Practice schedule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mark attendance for a practice session
router.post('/:id/attendance', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const { memberId, status } = req.body;

    if (!memberId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: memberId and status'
      });
    }

    if (!['present', 'absent', 'excused'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: present, absent, excused'
      });
    }

    const schedule = await PracticeSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Practice schedule not found'
      });
    }

    // Check if member already has attendance record
    const existingAttendance = schedule.attendance.find(
      att => att.memberId.toString() === memberId
    );

    if (existingAttendance) {
      existingAttendance.status = status;
      existingAttendance.markedAt = new Date();
    } else {
      schedule.attendance.push({
        memberId,
        status,
        markedAt: new Date()
      });
    }

    await schedule.save();
    await schedule.populate('attendance.memberId', 'firstName lastName email');

    res.json({
      success: true,
      data: schedule,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get attendance for a practice session
router.get('/:id/attendance', async (req, res) => {
  try {
    const schedule = await PracticeSchedule.findById(req.params.id)
      .populate('attendance.memberId', 'firstName lastName email');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Practice schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule.attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
