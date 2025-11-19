import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  getMyOrders,
  confirmOrder,
  declineOrder,
  deleteOrder,
  getOrderStats,
  exportOrdersToExcel
} from '../controllers/orderController.js';

const router = express.Router();

// Admin/Moderator routes (specific paths first)
router.get('/stats/summary', authenticate, authorize('admin', 'moderator'), getOrderStats);
router.get('/export/excel', authenticate, authorize('admin', 'moderator'), exportOrdersToExcel);
router.get('/my-orders', authenticate, getMyOrders);
router.put('/:id/confirm', authenticate, authorize('admin', 'moderator'), confirmOrder);
router.put('/:id/decline', authenticate, authorize('admin', 'moderator'), declineOrder);

// Member routes
router.post('/', authenticate, upload.single('receipt'), createOrder);
router.get('/:id', authenticate, getOrderById);
router.delete('/:id', authenticate, deleteOrder);

// Admin get all orders - must be last to not conflict with other routes
router.get('/', authenticate, authorize('admin', 'moderator'), getAllOrders);

export default router;
