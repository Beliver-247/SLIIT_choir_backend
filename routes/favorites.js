import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  addFavorite,
  removeFavorite,
  getMyFavorites,
  checkFavorite
} from '../controllers/favoriteController.js';

const router = express.Router();

// All routes require authentication
router.post('/', authenticate, addFavorite);
router.delete('/:resourceId', authenticate, removeFavorite);
router.get('/', authenticate, getMyFavorites);
router.get('/check/:resourceId', authenticate, checkFavorite);

export default router;
