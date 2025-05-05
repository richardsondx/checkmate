/**
 * Authentication Controller
 * Handles user registration, login, and password reset
 */
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { sendEmail } from '../utils/email';
import { generateResetToken, verifyToken } from '../utils/tokens';
import { validatePassword, validateEmail } from '../utils/validators';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const TOKEN_EXPIRY = '24h';

/**
 * Register a new user
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;
    
    // Validate inputs
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password does not meet requirements' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY
    });
    
    // Return success with token
    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * Login a user
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Log failed attempt
      logger.warn(`Failed login attempt for user: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY
    });
    
    // Log successful login
    logger.info(`User logged in: ${email}`);
    
    // Return success with token
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({ message: 'If your email exists, a reset link will be sent' });
    }
    
    // Generate reset token
    const resetToken = generateResetToken(user._id);
    
    // Update user with token
    user.resetToken = resetToken.token;
    user.resetTokenExpires = resetToken.expires;
    await user.save();
    
    // Send email with reset link
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken.token}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset',
      text: `Please use the following link to reset your password: ${resetUrl}`
    });
    
    return res.status(200).json({ message: 'If your email exists, a reset link will be sent' });
  } catch (error) {
    logger.error('Password reset request error:', error);
    return res.status(500).json({ error: 'Password reset failed' });
  }
}

/**
 * Verify reset token
 */
export async function verifyResetToken(req: Request, res: Response) {
  try {
    const { token } = req.params;
    
    // Find user with this token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    return res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(500).json({ error: 'Token verification failed' });
  }
}

/**
 * Reset password using token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password does not meet requirements' });
    }
    
    // Find user with this token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user password
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    
    logger.info(`Password reset successful for user: ${user.email}`);
    
    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Password reset error:', error);
    return res.status(500).json({ error: 'Password reset failed' });
  }
} 