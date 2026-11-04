import jwt from 'jsonwebtoken';
import { fail } from '../lib/db.mjs';


export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_TTL = process.env.JWT_TTL || '7d';

export function signSession(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_TTL });
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next(fail(401, 'unauthorized'));
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    if (payload.kind) return next(fail(401, 'unauthorized'));
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    return next(fail(401, 'unauthorized'));
  }
  next();
}

export function authOptional(req, res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      req.user = payload.kind ? undefined : { id: payload.sub, role: payload.role };
    } catch {
      req.user = undefined;
    }
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(fail(401, 'unauthorized'));
    if (!roles.includes(req.user.role)) return next(fail(403, 'forbidden'));
    next();
  };
}

export const requireAdmin = requireRole('admin');
