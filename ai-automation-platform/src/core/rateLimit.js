// Rate limiting middleware with optional Redis backend
import { createClient as createRedis } from 'redis';

const rateLimitStore = new Map();

export async function makeRateLimiter(pool, redisClient = null) {
  return async (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
              req.socket.remoteAddress || 'unknown';
    
    const key = `rate_limit:${ip}`;
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;
    
    try {
      let requests = 0;
      const now = Date.now();
      
      if (redisClient) {
        // Use Redis for distributed rate limiting
        const current = await redisClient.get(key);
        requests = current ? parseInt(current) : 0;
        
        if (requests >= maxRequests) {
          return res.status(429).json({ error: 'Too many requests' });
        }
        
        const pipeline = redisClient.multi();
        pipeline.incr(key);
        pipeline.expire(key, Math.ceil(windowMs / 1000));
        await pipeline.exec();
      } else {
        // Use in-memory store
        const record = rateLimitStore.get(key);
        
        if (record) {
          if (now - record.resetTime < windowMs) {
            requests = record.requests;
            if (requests >= maxRequests) {
              return res.status(429).json({ error: 'Too many requests' });
            }
            record.requests++;
          } else {
            // Reset window
            record.requests = 1;
            record.resetTime = now;
          }
        } else {
          rateLimitStore.set(key, { requests: 1, resetTime: now });
        }
        
        // Clean up old entries periodically
        if (Math.random() < 0.01) {
          for (const [k, v] of rateLimitStore.entries()) {
            if (now - v.resetTime > windowMs) {
              rateLimitStore.delete(k);
            }
          }
        }
      }
      
      next();
    } catch (error) {
      console.warn('Rate limiting error:', error.message);
      next(); // Continue on rate limiter failure
    }
  };
}
