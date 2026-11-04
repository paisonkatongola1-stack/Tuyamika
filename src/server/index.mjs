import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { authRouter } from './routes/auth.mjs';
import { registryRouter } from './routes/registry.mjs';
import { guestRouter, shareRouter } from './routes/guest.mjs';
import { paymentRouter } from './routes/payments.mjs';
import { retailerRouter } from './routes/retailer.mjs';
import { adminRouter } from './routes/admin.mjs';
import { notificationsRouter } from './routes/notifications.mjs';
import { fail } from './lib/db.mjs';
import { sweepExpired } from './lib/reservation.mjs';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('short'));

app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRouter);
app.use('/api/registries', registryRouter);
app.use('/api', guestRouter);
app.use('/', shareRouter);
app.use('/api', paymentRouter);
app.use('/api/retailer', retailerRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);

app.use((req, res, next) => next(fail(404, 'not found')));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
});

setInterval(() => sweepExpired(), 60_000).unref();

const PORT = +(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`tuyamika listening on :${PORT}`);
});

export default app;
