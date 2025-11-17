import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Donation from '../models/Donation.js';

const router = express.Router();

// Create donation
router.post('/', async (req, res) => {
  try {
    const { donorName, donorEmail, amount, currency, tier, paymentMethod, message, isAnonymous, memberId } = req.body;

    if (!donorName || !donorEmail || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const donation = new Donation({
      donorName,
      donorEmail,
      amount,
      currency: currency || 'USD',
      tier: tier || 'supporter',
      paymentMethod: paymentMethod || 'credit_card',
      message,
      isAnonymous: isAnonymous || false,
      memberId: memberId || null,
      status: 'pending',
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    await donation.save();
    res.status(201).json({ success: true, data: donation, message: 'Donation recorded' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all donations (admin/moderator only)
router.get('/', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const { status, startDate, endDate, minAmount, maxAmount } = req.query;
    let query = {};

    if (status) query.status = status;
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const donations = await Donation.find(query)
      .populate('memberId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get donation statistics (admin/moderator only)
router.get('/stats/summary', authenticate, authorize('moderator', 'admin'), async (req, res) => {
  try {
    const stats = await Donation.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalDonations: { $sum: '$amount' },
          donorCount: { $sum: 1 },
          averageDonation: { $avg: '$amount' },
          maxDonation: { $max: '$amount' },
          minDonation: { $min: '$amount' }
        }
      }
    ]);

    const tierStats = await Donation.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || { totalDonations: 0, donorCount: 0, averageDonation: 0, maxDonation: 0, minDonation: 0 },
        byTier: tierStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get donation by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id).populate('memberId', 'firstName lastName');
    
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Non-anonymous donations or authenticated users can see details
    if (!donation.isAnonymous || req.user.role === 'admin') {
      res.json({ success: true, data: donation });
    } else {
      res.status(403).json({ success: false, message: 'Donation is anonymous' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update donation status (admin only)
router.put('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const donation = await Donation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    res.json({ success: true, data: donation, message: 'Donation status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete donation (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    res.json({ success: true, message: 'Donation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
