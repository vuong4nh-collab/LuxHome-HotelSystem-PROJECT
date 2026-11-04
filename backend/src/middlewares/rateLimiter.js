/**
 * In-memory sliding window rate limiter middleware (AUD-011)
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests allowed per window
 * @param {string} options.message - Error message when rate limit exceeded
 */
const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 10, message = 'Quá nhiều yêu cầu, vui lòng thử lại sau.' } = {}) => {
  const requests = new Map();

  // Dọn dẹp bộ nhớ định kỳ
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requests.entries()) {
      if (now > record.resetTime) {
        requests.delete(key);
      }
    }
  }, Math.max(windowMs, 60 * 1000));

  // Không giữ Node process chạy chỉ vì timer này
  if (cleanupTimer.unref) cleanupTimer.unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = requests.get(ip);
    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    record.count += 1;
    next();
  };
};

module.exports = { rateLimit };
