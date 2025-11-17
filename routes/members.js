import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Member from '../models/Member.js';

const router = express.Router();

// Get all members (admin/moderator only)
router.get('/', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const members = await Member.find().select('-password');
    res.json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get member by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).select('-password');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update member profile
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Members can only update their own profile unless they're admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { firstName, lastName, phoneNumber, bio, avatar } = req.body;
    const updates = { firstName, lastName, phoneNumber, bio, avatar };

    const member = await Member.findByIdAndUpdate(req.params.id, updates, { 
      new: true 
    }).select('-password');

    res.json({ success: true, data: member, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete member (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, message: 'Member deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Suspend/Activate member (admin/moderator only)
router.put('/:id/status', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');

    res.json({ success: true, data: member, message: `Member status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
