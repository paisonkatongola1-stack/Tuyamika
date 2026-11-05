import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function lane(name, { max, windowMinutes }) {
  const windowMs = windowMinutes * 60_000;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const tokenUser = req.user?.id;
      return tokenUser ?? ipKeyGenerator(req.ip);
    },
    handler: (req, res) => {
      console.log(`rate_limit_block: ${name} exceeded for key ${req.ip} (user=${req.user?.id || 'N/A'})`);
      res.status(429).json({ error: 'too many requests', lane: name, retry_after_seconds: Math.ceil(windowMs / 1000) });
    },
  });
}

export const authLimiter = lane('auth', {
  max: +(process.env.RL_AUTH_MAX || 20),
  windowMinutes: +(process.env.RL_AUTH_WINDOW_MIN || 15),
});
export const guestLimiter = lane('guest', {
  max: +(process.env.RL_GUEST_MAX || 120),
  windowMinutes: +(process.env.RL_GUEST_WINDOW_MIN || 15),
});
export const payLimiter = lane('pay', {
  max: +(process.env.RL_PAY_MAX || 30),
  windowMinutes: +(process.env.RL_PAY_WINDOW_MIN || 15),
});
