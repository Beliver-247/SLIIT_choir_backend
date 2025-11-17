import express from 'express';
import passport from 'passport';
import { googleAuthCallback, googleAuthFailure } from '../controllers/googleAuthController.js';

const router = express.Router();

// Initiate Google login
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google callback route
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/google/failure' }),
  googleAuthCallback
);

// Failure route
router.get('/google/failure', googleAuthFailure);

export default router;
