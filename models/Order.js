import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  items: [{
    merchandiseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchandise',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    size: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  receipt: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'declined'],
    default: 'pending'
  },
  declineReason: {
    type: String,
    default: null,
    trim: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
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
orderSchema.index({ memberId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Update timestamp on save
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Order', orderSchema);
