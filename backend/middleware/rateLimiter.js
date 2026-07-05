function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10 } = {}) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, windowMs);
  if (typeof sweep.unref === "function") sweep.unref();

  return function rateLimiter(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res
        .status(429)
        .json({ error: "Too many requests. Please try again later." });
    }

    next();
  };
}

module.exports = createRateLimiter;
