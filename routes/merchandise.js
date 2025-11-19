import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAllMerchandise,
  getMerchandiseById,
  createMerchandise,
  updateMerchandise,
  deleteMerchandise
} from '../controllers/merchandiseController.js';

const router = express.Router();

// Admin/Moderator only routes (more specific methods first)
router.post('/', authenticate, authorize('admin', 'moderator'), createMerchandise);
router.put('/:id', authenticate, authorize('admin', 'moderator'), updateMerchandise);
router.delete('/:id', authenticate, authorize('admin', 'moderator'), deleteMerchandise);

// Public routes (for authenticated members) - GET routes last
router.get('/:id', authenticate, getMerchandiseById);
router.get('/', authenticate, getAllMerchandise);

export default router;
