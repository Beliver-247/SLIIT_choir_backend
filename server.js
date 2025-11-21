import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import memberRoutes from './routes/members.js';
import eventRoutes from './routes/events.js';
import donationRoutes from './routes/donations.js';
import scheduleRoutes from './routes/schedules.js';
import attendanceRoutes from './routes/attendance.js';
import merchandiseRoutes from './routes/merchandise.js';
import orderRoutes from './routes/orders.js';
import resourceRoutes from './routes/resources.js';
import resourceRequestRoutes from './routes/resourceRequests.js';
import favoriteRoutes from './routes/favorites.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SENSITIVE_KEYS = ['password', 'confirmPassword', 'otp', 'token', 'code'];

const sanitizeBody = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizeBody(item));
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (SENSITIVE_KEYS.includes(key)) {
      acc[key] = '***redacted***';
    } else if (value && typeof value === 'object') {
      acc[key] = sanitizeBody(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,                     // e.g. https://sliit-choir-frontend.vercel.app
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'https://sliit-choir-frontend.vercel.app',
      'https://sliit-choir-frontend-git-main-beliver-247s-projects.vercel.app',
      'https://sliit-choir-frontend-1p4vgtq7z-beliver-247s-projects.vercel.app'
    ].filter(Boolean); // removes undefined if FRONTEND_URL isn't set

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Some requests (like curl, Postman) may have no origin
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('❌ CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(sanitizeBody(req.body), null, 2));
  }
  next();
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Atlas connected'))
  .catch(err => {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/merchandise', merchandiseRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/resource-requests', resourceRequestRoutes);
app.use('/api/favorites', favoriteRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

app.listen(PORT, () => {
  console.log(`\n🎵 SLIIT Choir Backend Server`);
  console.log(`📍 Running on: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api\n`);
});
