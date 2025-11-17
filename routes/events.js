import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Event from '../models/Event.js';

const router = express.Router();

// Create event (admin/moderator only)
router.post('/', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const { title, description, date, time, location, eventType, capacity, image } = req.body;

    if (!title || !date || !eventType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const event = new Event({
      title,
      description,
      date,
      time,
      location,
      eventType,
      capacity: capacity || 100,
      image,
      createdBy: req.user.id,
      status: 'upcoming'
    });

    await event.save();
    res.status(201).json({ success: true, data: event, message: 'Event created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const { status, type, startDate, endDate } = req.query;
    let query = {};

    if (status) query.status = status;
    if (type) query.eventType = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const events = await Event.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ date: 1 });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('registrations.memberId', 'firstName lastName email');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update event (admin/moderator only)
router.put('/:id', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const { title, description, date, time, location, eventType, capacity, image, status } = req.body;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { title, description, date, time, location, eventType, capacity, image, status },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event, message: 'Event updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete event (admin/moderator only)
router.delete('/:id', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Register member for event
router.post('/:id/register', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if already registered
    const existingRegistration = event.registrations.find(
      reg => reg.memberId.toString() === req.user.id
    );

    if (existingRegistration) {
      return res.status(400).json({ success: false, message: 'Already registered for this event' });
    }

    // Check capacity
    const confirmedCount = event.registrations.filter(r => r.status === 'confirmed').length;
    if (confirmedCount >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Event is at capacity' });
    }

    event.registrations.push({
      memberId: req.user.id,
      status: 'confirmed',
      registeredAt: new Date()
    });

    await event.save();
    res.json({ success: true, data: event, message: 'Registered for event' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unregister member from event
router.delete('/:id/register', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    event.registrations = event.registrations.filter(
      reg => reg.memberId.toString() !== req.user.id
    );

    await event.save();
    res.json({ success: true, data: event, message: 'Unregistered from event' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
