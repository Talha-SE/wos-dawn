import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  userId?: string;
  body: any;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token as string;
  }
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { id: string };
    req.userId = payload.id;
    if (req.query?.token) delete req.query.token;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export async function checkSuspended(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const user = await User.findById(req.userId).select('suspended suspendedUntil');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.suspended) {
      if (user.suspendedUntil && new Date() > user.suspendedUntil) {
        // Suspension expired, automatically unsuspend
        await User.findByIdAndUpdate(req.userId, { suspended: false, suspendedUntil: null });
        return next();
      }
      return res.status(403).json({ 
        message: 'Account suspended', 
        suspendedUntil: user.suspendedUntil 
      });
    }
    
    next();
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to check suspension status' });
  }
}
