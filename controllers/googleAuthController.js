import jwt from 'jsonwebtoken';

export const googleAuthCallback = (req, res) => {
  try {
    // Member is attached to req.user by Passport
    const member = req.user;

    // Generate JWT token
    const token = jwt.sign(
      { id: member._id, email: member.email, role: member.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Redirect to frontend with token
    // Frontend will extract token from URL and store in localStorage
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth-success?token=${token}&member=${encodeURIComponent(JSON.stringify(member.toJSON()))}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google Auth Callback Error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=Google authentication failed`);
  }
};

export const googleAuthFailure = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=Google authentication failed`);
};
