import jwt from 'jsonwebtoken';
import Member from '../models/Member.js';

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

    // Check if StudentID already exists
    const existingByStudentId = await Member.findOne({ studentId: studentId.toUpperCase() });
    if (existingByStudentId) {
      console.warn('[AUTH] Registration failed - StudentID already exists:', studentId.toUpperCase());
      return res.status(409).json({ message: 'StudentID already registered' });
    }

    // Check if email already exists
    const existingByEmail = await Member.findOne({ email });
    if (existingByEmail) {
      console.warn('[AUTH] Registration failed - Email already exists:', email);
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Create new member
    const member = new Member({
      firstName,
      lastName,
      studentId: studentId.toUpperCase(),
      email,
      password
    });

    await member.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: member._id, studentId: member.studentId, role: member.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log('[AUTH] Registration successful for:', studentId.toUpperCase());

    res.status(201).json({
      message: 'Member registered successfully',
      token,
      member: member.toJSON()
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
