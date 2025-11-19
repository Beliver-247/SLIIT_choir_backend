import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  createResource,
  getAllResources,
  getResourceById,
  updateResource,
  deleteResource,
  getResourcesBySong
} from '../controllers/resourceController.js';

const router = express.Router();

// Public/Member routes
router.get('/by-song', authenticate, getResourcesBySong);
router.get('/:id', authenticate, getResourceById);
router.get('/', authenticate, getAllResources);

// Admin/Moderator routes
router.post('/', authenticate, authorize('admin', 'moderator'), upload.single('file'), createResource);
router.put('/:id', authenticate, authorize('admin', 'moderator'), updateResource);
router.delete('/:id', authenticate, authorize('admin', 'moderator'), deleteResource);

export default router;
