import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import Event from '../models/Event.js';
import PracticeSchedule from '../models/PracticeSchedule.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mark attendance for a member
export const markAttendance = async (req, res) => {
  try {
    const { eventId, scheduleId, memberId, status, comments } = req.body;

    // Validate input
    if (!memberId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: memberId and status'
      });
    }

    if (!eventId && !scheduleId) {
      return res.status(400).json({
        success: false,
        message: 'Either eventId or scheduleId must be provided'
      });
    }

    if (!['present', 'absent', 'excused', 'late'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: present, absent, excused, late'
      });
    }

    // Verify member exists
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check if attendance record already exists
    const query = { memberId };
    if (eventId) query.eventId = eventId;
    if (scheduleId) query.scheduleId = scheduleId;

    let attendance = await Attendance.findOne(query);

    if (attendance) {
      // Update existing record
      attendance.status = status;
      attendance.comments = comments || attendance.comments;
      attendance.markedAt = new Date();
      attendance.updatedAt = new Date();
    } else {
      // Create new record
      attendance = new Attendance({
        eventId: eventId || null,
        scheduleId: scheduleId || null,
        memberId,
        status,
        markedBy: req.user.id,
        comments: comments || null
      });
    }

    await attendance.save();
    await attendance.populate('memberId', 'firstName lastName email');
    await attendance.populate('markedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: attendance,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get attendance records with filters
export const getAttendance = async (req, res) => {
  try {
    const { eventId, scheduleId, memberId, status, startDate, endDate, limit = 50, page = 1 } = req.query;

    let query = {};

    if (eventId) query.eventId = eventId;
    if (scheduleId) query.scheduleId = scheduleId;
    if (memberId) query.memberId = memberId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.markedAt = {};
      if (startDate) query.markedAt.$gte = new Date(startDate);
      if (endDate) query.markedAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .populate('memberId', 'firstName lastName email studentId')
        .populate('eventId', 'title date')
        .populate('scheduleId', 'title date')
        .populate('markedBy', 'firstName lastName')
        .sort({ markedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get attendance for a specific event
export const getEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).populate('registrations.memberId');
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const attendance = await Attendance.find({ eventId })
      .populate('memberId', 'firstName lastName email studentId')
      .populate('markedBy', 'firstName lastName')
      .sort({ markedAt: -1 });

    // Combine with registrations to show all registered members
    const registeredMembers = event.registrations.map(reg => ({
      memberId: reg.memberId._id,
      name: `${reg.memberId.firstName} ${reg.memberId.lastName}`,
      email: reg.memberId.email,
      studentId: reg.memberId.studentId,
      registered: true
    }));

    const attendanceMap = {};
    attendance.forEach(att => {
      attendanceMap[att.memberId._id] = att;
    });

    const result = registeredMembers.map(member => ({
      ...member,
      attendance: attendanceMap[member.memberId] || null
    }));

    res.json({
      success: true,
      data: result,
      totalRegistered: registeredMembers.length,
      totalAttended: attendance.filter(a => a.status === 'present').length,
      totalAbsent: attendance.filter(a => a.status === 'absent').length,
      totalExcused: attendance.filter(a => a.status === 'excused').length,
      totalLate: attendance.filter(a => a.status === 'late').length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get attendance for a specific practice schedule
export const getScheduleAttendance = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await PracticeSchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const attendance = await Attendance.find({ scheduleId })
      .populate('memberId', 'firstName lastName email studentId')
      .populate('markedBy', 'firstName lastName')
      .sort({ markedAt: -1 });

    res.json({
      success: true,
      data: attendance,
      summary: {
        total: attendance.length,
        present: attendance.filter(a => a.status === 'present').length,
        absent: attendance.filter(a => a.status === 'absent').length,
        excused: attendance.filter(a => a.status === 'excused').length,
        late: attendance.filter(a => a.status === 'late').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update attendance record
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    if (status) {
      if (!['present', 'absent', 'excused', 'late'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }
      attendance.status = status;
    }

    if (comments !== undefined) {
      attendance.comments = comments;
    }

    attendance.updatedAt = new Date();
    await attendance.save();
    await attendance.populate('memberId', 'firstName lastName email');
    await attendance.populate('markedBy', 'firstName lastName');

    res.json({
      success: true,
      data: attendance,
      message: 'Attendance updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete attendance record
export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findByIdAndDelete(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export attendance to Excel
export const exportAttendanceToExcel = async (req, res) => {
  try {
    const { eventId, scheduleId, status, startDate, endDate, format = 'xlsx' } = req.query;

    let query = {};
    if (eventId) query.eventId = eventId;
    if (scheduleId) query.scheduleId = scheduleId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.markedAt = {};
      if (startDate) query.markedAt.$gte = new Date(startDate);
      if (endDate) query.markedAt.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate('memberId', 'firstName lastName email studentId')
      .populate('eventId', 'title date')
      .populate('scheduleId', 'title date')
      .populate('markedBy', 'firstName lastName')
      .lean();

    if (attendance.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance records found'
      });
    }

    // Transform data for Excel
    const excelData = attendance.map(record => ({
      'First Name': record.memberId?.firstName || 'N/A',
      'Last Name': record.memberId?.lastName || 'N/A',
      'Email': record.memberId?.email || 'N/A',
      'Student ID': record.memberId?.studentId || 'N/A',
      'Event': record.eventId?.title || record.scheduleId?.title || 'N/A',
      'Date': record.eventId?.date || record.scheduleId?.date || record.markedAt,
      'Status': record.status,
      'Marked By': `${record.markedBy?.firstName || ''} ${record.markedBy?.lastName || ''}`.trim(),
      'Marked At': new Date(record.markedAt).toLocaleString(),
      'Comments': record.comments || ''
    }));

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    // Auto-adjust column widths
    const maxWidth = 30;
    worksheet['!cols'] = Object.keys(excelData[0]).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 15))
    }));

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `attendance_${timestamp}.xlsx`;
    const filepath = path.join(__dirname, `../temp/${filename}`);

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write file
    XLSX.writeFile(workbook, filepath);

    // Send file
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Delete file after sending
      try {
        fs.unlinkSync(filepath);
      } catch (unlinkErr) {
        console.error('Error deleting temp file:', unlinkErr);
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get attendance analytics
export const getAttendanceAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, memberId, eventId, scheduleId } = req.query;

    let query = {};
    if (memberId) query.memberId = memberId;
    if (eventId) query.eventId = eventId;
    if (scheduleId) query.scheduleId = scheduleId;

    if (startDate || endDate) {
      query.markedAt = {};
      if (startDate) query.markedAt.$gte = new Date(startDate);
      if (endDate) query.markedAt.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query).populate('memberId', 'firstName lastName');

    // Calculate statistics
    const stats = {
      totalRecords: attendance.length,
      byStatus: {
        present: attendance.filter(a => a.status === 'present').length,
        absent: attendance.filter(a => a.status === 'absent').length,
        excused: attendance.filter(a => a.status === 'excused').length,
        late: attendance.filter(a => a.status === 'late').length
      },
      attendanceRate: attendance.length > 0
        ? ((attendance.filter(a => a.status === 'present').length / attendance.length) * 100).toFixed(2)
        : 0
    };

    // Group by member
    const memberStats = {};
    attendance.forEach(record => {
      const memberId = record.memberId._id.toString();
      const memberName = `${record.memberId.firstName} ${record.memberId.lastName}`;

      if (!memberStats[memberId]) {
        memberStats[memberId] = {
          memberId,
          name: memberName,
          total: 0,
          present: 0,
          absent: 0,
          excused: 0,
          late: 0
        };
      }

      memberStats[memberId].total++;
      memberStats[memberId][record.status]++;
    });

    // Calculate attendance percentage for each member
    const memberAnalytics = Object.values(memberStats).map(member => ({
      ...member,
      attendancePercentage: ((member.present / member.total) * 100).toFixed(2)
    }));

    // Group by date (if applicable)
    const dateStats = {};
    attendance.forEach(record => {
      const dateKey = new Date(record.markedAt).toISOString().split('T')[0];
      if (!dateStats[dateKey]) {
        dateStats[dateKey] = {
          date: dateKey,
          total: 0,
          present: 0,
          absent: 0,
          excused: 0,
          late: 0
        };
      }
      dateStats[dateKey].total++;
      dateStats[dateKey][record.status]++;
    });

    const dailyAnalytics = Object.values(dateStats).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: {
        summary: stats,
        memberAnalytics: memberAnalytics.sort((a, b) => parseFloat(b.attendancePercentage) - parseFloat(a.attendancePercentage)),
        dailyAnalytics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get member attendance history
export const getMemberAttendanceHistory = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { startDate, endDate, limit = 50, page = 1 } = req.query;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    let query = { memberId };
    if (startDate || endDate) {
      query.markedAt = {};
      if (startDate) query.markedAt.$gte = new Date(startDate);
      if (endDate) query.markedAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await Promise.all([
      Attendance.find(query)
        .populate('eventId', 'title date')
        .populate('scheduleId', 'title date')
        .populate('markedBy', 'firstName lastName')
        .sort({ markedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query)
    ]);

    // Calculate statistics
    const stats = {
      total,
      present: history.filter(a => a.status === 'present').length,
      absent: history.filter(a => a.status === 'absent').length,
      excused: history.filter(a => a.status === 'excused').length,
      late: history.filter(a => a.status === 'late').length
    };

    res.json({
      success: true,
      data: {
        member: {
          id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          studentId: member.studentId
        },
        attendance: history,
        stats,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
