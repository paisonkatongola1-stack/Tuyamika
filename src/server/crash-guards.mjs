import { logError } from './lib/errorlog.mjs';

// Event handlers for uncaughtException / unhandledRejection. Kept out of
// index.mjs so the API module stays embeddable in tests without process hooks.
export function logCrash(err) {
  logError('server', err, { ctx: { fatal: true }, level: 'fatal' });
  console.error(`fatal: ${err?.message ?? err}\n${err?.stack ?? ''}`);
}
