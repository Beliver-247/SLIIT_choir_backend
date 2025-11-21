import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Member from '../models/Member.js';
import { sendVerificationEmail } from '../utils/emailService.js';

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const register = async (req, res) => {
  try {
    const { firstName, lastName, studentId, email, password, confirmPassword } = req.body;

    console.log('[AUTH] Registration attempt for:', studentId);

    // Validate required fields
    if (!firstName || !lastName || !studentId || !email || !password) {
      console.warn('[AUTH] Registration failed - Missing fields');
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Validate StudentID format
    const studentIdRegex = /^[A-Z]{2}\d{8}$/;
    if (!studentIdRegex.test(studentId.toUpperCase())) {
      console.warn('[AUTH] Registration failed - Invalid StudentID format:', studentId);
      return res.status(400).json({ 
        message: 'Invalid StudentID format. Expected: 2 letters followed by 8 digits (e.g., CS12345678)' 
      });
    }

    // Validate password match
    if (password !== confirmPassword) {
      console.warn('[AUTH] Registration failed - Passwords do not match');
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const normalizedStudentId = studentId.toUpperCase();
    const normalizedEmail = email.toLowerCase();

    const expectedEmail = `${normalizedStudentId.toLowerCase()}@my.sliit.lk`;
    if (normalizedEmail !== expectedEmail) {
      console.warn('[AUTH] Registration failed - Email mismatch for studentId:', normalizedStudentId);
      return res.status(400).json({
        message: 'Email must match your student ID (e.g., it22110084@my.sliit.lk)'
      });
    }

    // Check if StudentID already exists
    const existingByStudentId = await Member.findOne({ studentId: normalizedStudentId });
    if (existingByStudentId) {
      console.warn('[AUTH] Registration failed - StudentID already exists:', studentId.toUpperCase());
      return res.status(409).json({ message: 'StudentID already registered' });
    }

    // Check if email already exists
    const existingByEmail = await Member.findOne({ email: normalizedEmail });
    if (existingByEmail) {
      console.warn('[AUTH] Registration failed - Email already exists:', email);
      return res.status(409).json({ message: 'Email already registered' });
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Create new member
    const member = new Member({
      firstName,
      lastName,
      studentId: normalizedStudentId,
      email: normalizedEmail,
      password,
      status: 'inactive',
      emailVerified: false,
      verificationCode: hashedOtp,
      verificationExpires: new Date(Date.now() + 15 * 60 * 1000)
    });

    await member.save();

    await sendVerificationEmail({
      to: member.email,
      code: otp,
      name: member.firstName
    });

    console.log('[AUTH] Registration pending verification for:', normalizedStudentId);

    res.status(201).json({
      message: 'Registration received. Please verify the code sent to your email to activate your account.',
      requiresVerification: true
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { studentId, password } = req.body;

    console.log('[AUTH] Login attempt for StudentID:', studentId);

    // Validate required fields
    if (!studentId || !password) {
      console.warn('[AUTH] Login failed - Missing credentials');
      return res.status(400).json({ message: 'Please provide StudentID and password' });
    }

    // Find member by StudentID
    const member = await Member.findOne({ studentId: studentId.toUpperCase() });
    if (!member) {
      console.warn('[AUTH] Login failed - StudentID not found:', studentId.toUpperCase());
      return res.status(401).json({ message: 'Invalid StudentID or password' });
    }

    // Check password
    const isPasswordValid = await member.comparePassword(password);
    if (!isPasswordValid) {
      console.warn('[AUTH] Login failed - Invalid password for:', studentId.toUpperCase());
      return res.status(401).json({ message: 'Invalid StudentID or password' });
    }

    if (!member.emailVerified) {
      console.warn('[AUTH] Login failed - Email not verified for:', studentId.toUpperCase());
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    // Check account status
    if (member.status !== 'active') {
      console.warn('[AUTH] Login failed - Account not active:', studentId.toUpperCase(), 'Status:', member.status);
      return res.status(403).json({ message: 'Account is not active' });
    }

    // Update last login
    member.lastLogin = new Date();
    await member.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: member._id, studentId: member.studentId, role: member.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log('[AUTH] Login successful for:', studentId.toUpperCase());

    res.json({
      message: 'Login successful',
      token,
      member: member.toJSON()
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.json(member.toJSON());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { studentId, otp } = req.body;

    if (!studentId || !otp) {
      return res.status(400).json({ message: 'StudentID and OTP are required' });
    }

    const member = await Member.findOne({ studentId: studentId.toUpperCase() });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (member.emailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    if (!member.verificationCode || !member.verificationExpires) {
      return res.status(400).json({ message: 'No active verification code. Please register again.' });
    }

    if (member.verificationExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code expired. Please register again.' });
    }

    const isMatch = await bcrypt.compare(otp, member.verificationCode);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    member.emailVerified = true;
    member.status = 'active';
    member.verificationCode = undefined;
    member.verificationExpires = undefined;
    await member.save();

    const token = jwt.sign(
      { id: member._id, studentId: member.studentId, role: member.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log('[AUTH] Email verified for:', studentId.toUpperCase());

    res.json({
      message: 'Email verified successfully',
      token,
      member: member.toJSON()
    });
  } catch (error) {
    console.error('[AUTH] Email verification error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};
