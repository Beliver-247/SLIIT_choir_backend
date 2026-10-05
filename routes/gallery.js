import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  createGalleryItem,
  getAllGalleryItems,
  deleteGalleryItem,
  updateGalleryItem
} from '../controllers/galleryController.js';

const router = express.Router();

// Public routes
router.get('/', getAllGalleryItems);

// Admin/Moderator routes
router.post('/', authenticate, authorize('admin', 'moderator'), upload.single('file'), createGalleryItem);
router.put('/:id', authenticate, authorize('admin', 'moderator'), upload.single('file'), updateGalleryItem);
router.delete('/:id', authenticate, authorize('admin', 'moderator'), deleteGalleryItem);

export default router;
