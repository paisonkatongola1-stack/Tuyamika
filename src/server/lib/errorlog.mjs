import { db, uid, now } from './db.mjs';

const MAX_STACK = 4000;
const MAX_MESSAGE = 1000;

// Single write path for the error ledger (error_logs). Non-throwing by
// design: a failing telemetry write must never take down a request.
export function logError(source, err, context = {}) {
  try {
    const message = String(err?.message || err || 'unknown error').slice(0, MAX_MESSAGE);
    const stack = (err?.stack ? String(err.stack).slice(0, MAX_STACK) : null);
    db.prepare(
      `INSERT INTO error_logs (id, source, level, message, stack, page, context, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uid(),
      source,
      context.level || 'error',
      message,
      stack,
      context.page ?? null,
      JSON.stringify({
        ...(context.ctx || context || {}),
        stack: undefined,
        page: undefined,
        level: undefined,
      }),
      now()
    );
  } catch (writeErr) {
    console.error(`errorlog: failed to persist error (${writeErr?.message}) — original: ${err?.message ?? err}`);
  }
}

export const getClientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';
