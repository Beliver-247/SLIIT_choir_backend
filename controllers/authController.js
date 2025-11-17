import jwt from 'jsonwebtoken';
import Member from '../models/Member.js';

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingMember = await Member.findOne({ email });
    if (existingMember) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const member = new Member({
      firstName,
      lastName,
      email,
      password
    });

    await member.save();

    const token = jwt.sign(
      { id: member._id, email: member.email, role: member.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'Member registered successfully',
      token,
      member: member.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const member = await Member.findOne({ email });
    if (!member) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await member.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (member.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    const token = jwt.sign(
      { id: member._id, email: member.email, role: member.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      member: member.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
