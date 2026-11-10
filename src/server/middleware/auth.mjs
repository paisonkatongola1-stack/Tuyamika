import jwt from 'jsonwebtoken';
import { fail } from '../lib/db.mjs';

// Fail fast in production: sessions signed with a predictable default secret
// are forgeable. Local dev and smoke tests keep the fallback.
const isPlainDev =
  !process.env.NODE_ENV ||
  ['development', 'dev', 'test'].includes(process.env.NODE_ENV || '');
const secretFromEnv = !!process.env.JWT_SECRET;
if (!secretFromEnv && !isPlainDev) {
  console.error('jwt_config: refusing to start — set JWT_SECRET outside dev/test; the fallback secret is forgeable');
  process.exit(1);
}
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_TTL = process.env.JWT_TTL || '7d';
const SESSION_LOG_PREFIX = 'session_auth';

// Unsubscribe tokens ride in marketing email footers. Verifying them only
// flips users.email_optout (see routes/auth.mjs) — they are not session
// bearers ("wrong token kind" guard in authRequired covers misuse).
export function signOptoutToken(userId) {
  return jwt.sign({ sub: userId, kind: 'optout' }, JWT_SECRET, { expiresIn: '90d' });
}

export function signSession(user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_TTL });
  console.log(`${SESSION_LOG_PREFIX}: signed session for user ${user.id} (${user.role})`);
  return token;
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    console.log(`${SESSION_LOG_PREFIX}: missing bearer token for ${req.ip}`);
    return next(fail(401, 'unauthorized'));
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    if (payload.kind) {
      console.log(`${SESSION_LOG_PREFIX}: rejected verify token as session for ${payload.sub}`);
      return next(fail(401, 'unauthorized'));
    }
    req.user = { id: payload.sub, role: payload.role };
    console.log(`${SESSION_LOG_PREFIX}: authenticated user ${payload.sub} role ${payload.role}`);
  } catch (err) {
    console.log(`${SESSION_LOG_PREFIX}: token verification failed from ${req.ip}: ${err.message}`);
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
    } catch (err) {
      console.log(`${SESSION_LOG_PREFIX}: optional auth failed silently from ${req.ip}: ${err.message}`);
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
