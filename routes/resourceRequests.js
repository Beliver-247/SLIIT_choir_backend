import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  createResourceRequest,
  getAllResourceRequests,
  getMyResourceRequests,
  approveResourceRequest,
  rejectResourceRequest,
  deleteResourceRequest
} from '../controllers/resourceRequestController.js';

const router = express.Router();

// Member routes
router.post('/', authenticate, upload.single('file'), createResourceRequest);
router.get('/my-requests', authenticate, getMyResourceRequests);

// Admin/Moderator routes
router.get('/', authenticate, authorize('admin', 'moderator'), getAllResourceRequests);
router.put('/:id/approve', authenticate, authorize('admin', 'moderator'), approveResourceRequest);
router.put('/:id/reject', authenticate, authorize('admin', 'moderator'), rejectResourceRequest);
router.delete('/:id', authenticate, deleteResourceRequest);

export default router;
