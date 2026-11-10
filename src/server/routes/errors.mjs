import { Router } from 'express';
import z from 'zod';
import { fail } from '../lib/db.mjs';
import { authOptional } from '../middleware/auth.mjs';
import { guestLimiter } from '../middleware/ratelimit.mjs';
import { logError } from '../lib/errorlog.mjs';

// Public fault-report intake for the web console / guest pages. Fire-and-forget
// from the client (~navigator.sendBeacon or fetch); stored in error_logs and
// visible to admins. Rate limited with the guest lane (public surface).
export const errorRouter = Router();

const Report = z.object({
  message: z.string().min(1).max(1000),
  stack: z.string().max(4000).optional(),
  page: z.string().max(500).optional(),
  extra: z.record(z.unknown()).optional(),
});

errorRouter.post('/client-errors', guestLimiter, authOptional, (req, res) => {
  const parsed = Report.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  logError('client', { message: b.message, stack: b.stack }, {
    page: b.page ?? null,
    ctx: {
      ua: req.get('user-agent') || 'unknown',
      user_id: req.user?.id ?? 'anonymous',
    },
    extra: b.extra,
  });

  res.status(202).json({ ok: true });
});
