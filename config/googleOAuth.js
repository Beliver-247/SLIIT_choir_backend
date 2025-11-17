import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Member from '../models/Member.js';

export const configureGoogleStrategy = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if member exists with this Google ID
          let member = await Member.findOne({ googleId: profile.id });

          if (member) {
            // Update last login
            member.lastLogin = new Date();
            await member.save();
            return done(null, member);
          }

          // Create new member from Google profile
          const [firstName, lastName] = profile.displayName.split(' ');
          
          member = new Member({
            firstName: firstName || profile.displayName,
            lastName: lastName || '',
            email: profile.emails[0].value,
            googleId: profile.id,
            avatar: profile.photos[0]?.value || '',
            role: 'member',
            status: 'active',
            // Generate a random password since they're signing up via Google
            password: Math.random().toString(36).slice(-10)
          });

          await member.save();
          return done(null, member);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((member, done) => {
    done(null, member.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const member = await Member.findById(id);
      done(null, member);
    } catch (error) {
      done(error, null);
    }
  });
};
