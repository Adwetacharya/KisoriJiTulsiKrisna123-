import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { Role } from '../types.js';

export { Role };

const JWT_SECRET = process.env.JWT_SECRET || 'PLEASE_CHANGE_ME_SECRET';

const ROLE_HIERARCHY: Record<string, number> = {
  [Role.STUDENT]: 1,
  [Role.CLASS_REP]: 2,
  [Role.SUB_FACULTY]: 3,
  [Role.FACULTY]: 4,
  [Role.HOD]: 5,
  [Role.VICE_PRINCIPAL]: 6,
  [Role.PRINCIPAL]: 7,
  [Role.SUB_ADMIN]: 8,
  [Role.SUPER_ADMIN]: 9,
};

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
    branch?: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

export const authorize = (minRole: Role) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY[minRole]) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
};
