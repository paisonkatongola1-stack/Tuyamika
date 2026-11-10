import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { authRouter } from './routes/auth.mjs';
import { registryRouter } from './routes/registry.mjs';
import { guestRouter, shareRouter } from './routes/guest.mjs';
import { paymentRouter } from './routes/payments.mjs';
import { fulfilRouter, trackRouter } from './routes/fulfilment.mjs';
import { eventRouter } from './routes/events.mjs';
import { specialRouter } from './routes/specials.mjs';
import { retailerRouter } from './routes/retailer.mjs';
import { adminRouter } from './routes/admin.mjs';
import { notificationsRouter } from './routes/notifications.mjs';
import { catalogRouter } from './routes/catalog.mjs';
import { fail } from './lib/db.mjs';
import { sweepExpired } from './lib/reservation.mjs';
import { logError } from './lib/errorlog.mjs';
import { errorRouter } from './routes/errors.mjs';
import { legalRouter } from './routes/legal.mjs';
import { startNotifierWorker } from './lib/notifier.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const staticRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

const app = express();
app.enable('trust proxy'); // rate-limit IPs and HTTPS redirect address proxies correctly
app.use((req, res, next) => {
  if (process.env.FORCE_HTTPS === '1' && req.protocol !== 'https' && req.method === 'GET') {
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }
  next();
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // email-style helper pages inline a few colours
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    }
  },
  hsts: { maxAge: 15552000 } // 180 days
}));
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('short'));

app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRouter);
app.use('/api/registries', registryRouter);
app.use('/api', guestRouter);
app.use('/api/orders', trackRouter);              // GET /api/orders/track/:ref (public)
app.use('/', shareRouter);
app.use('/api', paymentRouter);
app.use('/api/fulfilment', fulfilRouter);
app.use('/api/events', eventRouter);
app.use('/api/specials', specialRouter);
app.use('/api', errorRouter);
app.use('/api/retailer', retailerRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api', catalogRouter);
app.use('/legal', legalRouter);

app.use(express.static(staticRoot));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/r/') && req.accepts('html')) {
    return res.sendFile(path.join(staticRoot, 'index.html'));
  }
  next(fail(404, 'not found'));
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const internal = status >= 500;
  if (internal) {
    logError('server', err, {
      ctx: {
        method: req.method,
        path: req.originalUrl || req.url,
        status,
        keys: req.method === 'POST' || req.method === 'PATCH' ? (req.body && Object.keys(req.body)) || null : undefined,
        ua: req.get('user-agent') || 'unknown',
      },
    });
    console.error(`srv_error: ${status} ${req.method} ${req.originalUrl} :: ${err.message}`);
  }
  res.status(status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
});

setInterval(() => sweepExpired(), 60_000).unref();
startNotifierWorker();

const PORT = +(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`tuyamika listening on :${PORT}`);
});

export default app;
