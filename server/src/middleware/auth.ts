import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';

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
