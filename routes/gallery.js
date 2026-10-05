import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  createGalleryItem,
  getAllGalleryItems,
  deleteGalleryItem
} from '../controllers/galleryController.js';

const router = express.Router();

// Public routes
router.get('/', getAllGalleryItems);

// Admin/Moderator routes
router.post('/', authenticate, authorize('admin', 'moderator'), upload.single('file'), createGalleryItem);
router.delete('/:id', authenticate, authorize('admin', 'moderator'), deleteGalleryItem);

export default router;
