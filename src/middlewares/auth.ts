/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

// Extend the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

/**
 * Middleware to protect routes that require authentication
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if ((error as Error).name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Middleware to refresh the JWT token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    // Get current token
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify current token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Generate new token
    const newToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, {
      expiresIn: '24h'
    });
    
    // Return new token
    return res.status(200).json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Middleware to validate user role
 */
export function checkRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  };
}

/**
 * Middleware to log all authentication attempts
 */
export function logAuthActivity(req: Request, res: Response, next: NextFunction) {
  const endpoint = req.originalUrl;
  const method = req.method;
  const ip = req.ip;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  logger.info(`Auth endpoint accessed: ${method} ${endpoint} from ${ip} using ${userAgent}`);
  
  next();
} 