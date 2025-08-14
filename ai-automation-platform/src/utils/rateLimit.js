// Rate limiting middleware for AI Automation Platform
// Supports global, per-user, per-IP, and per-key rate limiting

import { createClient } from 'redis';

/**
 * Create a rate limiter middleware
 * @param {Object} pool - PostgreSQL connection pool
 * @param {Object} redis - Redis client (optional, falls back to in-memory)
 * @returns {Function} Express middleware function
 */
export async function makeRateLimiter(pool, redis = null) {
  // In-memory fallback if Redis is not available
  const memoryStore = new Map();
  
  // Default rate limits
  const DEFAULT_LIMITS = {
    GLOBAL_PER_MIN: parseInt(process.env.GLOBAL_PER_MIN || '100', 10),
    GLOBAL_PER_DAY: parseInt(process.env.GLOBAL_PER_DAY || '10000', 10),
    USER_PER_MIN: parseInt(process.env.USER_PER_MIN || '60', 10),
    USER_PER_DAY: parseInt(process.env.USER_PER_DAY || '5000', 10),
    IP_PER_MIN: parseInt(process.env.IP_PER_MIN || '30', 10),
    IP_PER_DAY: parseInt(process.env.IP_PER_DAY || '1000', 10)
  };

  /**
   * Check rate limit using Redis or memory store
   * @param {string} scope - Rate limit scope (e.g., 'global:min', 'user:123:day')
   * @param {number} limit - Maximum allowed requests
   * @param {number} ttlSec - Time to live in seconds
   * @returns {Object} - { allowed, remaining, resetSec }
   */
  async function checkLimit(scope, limit, ttlSec) {
    if (redis) {
      // Use Redis for distributed rate limiting
      try {
        const key = `rl:${scope}`;
        const count = await redis.incr(key);
        
        if (count === 1) {
          await redis.expire(key, ttlSec);
        }
        
        const resetSec = await redis.ttl(key);
        
        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
          resetSec: resetSec > 0 ? resetSec : ttlSec
        };
      } catch (error) {
        console.warn('Redis rate limiting failed, falling back to memory:', error.message);
        // Fall through to memory store
      }
    }
    
    // Memory store fallback
    const now = Date.now();
    const key = `${scope}:${Math.floor(now / (ttlSec * 1000))}`;
    
    if (!memoryStore.has(key)) {
      memoryStore.set(key, { count: 0, expires: now + (ttlSec * 1000) });
      
      // Clean up expired entries
      for (const [k, v] of memoryStore.entries()) {
        if (v.expires < now) {
          memoryStore.delete(k);
        }
      }
    }
    
    const entry = memoryStore.get(key);
    entry.count++;
    
    const resetSec = Math.ceil((entry.expires - now) / 1000);
    
    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      resetSec: Math.max(0, resetSec)
    };
  }

  /**
   * Get custom rate limits from database
   * @param {string} scope - Rate limit scope
   * @returns {Object} - { perMin, perDay } or null if not found
   */
  async function getCustomLimits(scope) {
    try {
      const result = await pool.query(
        'SELECT max_per_min, max_per_day FROM rate_limits WHERE scope = $1',
        [scope]
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          perMin: row.max_per_min,
          perDay: row.max_per_day
        };
      }
    } catch (error) {
      console.warn('Failed to fetch custom rate limits:', error.message);
    }
    
    return null;
  }

  /**
   * Extract user ID from request (JWT token or API key)
   * @param {Object} req - Express request object
   * @returns {string|null} - User ID or null
   */
  function extractUserId(req) {
    // Try to get user from JWT token
    if (req.user && req.user.sub) {
      return req.user.sub;
    }
    
    // Try to get user from API key header
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      // This would need to be implemented to look up user by API key
      // For now, use the API key itself as identifier
      return `api:${apiKey}`;
    }
    
    return null;
  }

  /**
   * Main rate limiting middleware
   */
  return async function rateLimit(req, res, next) {
    try {
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                req.socket.remoteAddress || 'unknown';
      const userId = extractUserId(req);
      const keyUuid = req.headers['x-key-uuid'] || req.query.key_uuid || req.body?.key_uuid;

      // Check global rate limits
      const globalLimits = await getCustomLimits('global') || {
        perMin: DEFAULT_LIMITS.GLOBAL_PER_MIN,
        perDay: DEFAULT_LIMITS.GLOBAL_PER_DAY
      };

      const globalMin = await checkLimit('global:min', globalLimits.perMin, 60);
      const globalDay = await checkLimit('global:day', globalLimits.perDay, 24 * 3600);

      if (!globalMin.allowed || !globalDay.allowed) {
        return res.status(429).json({
          error: 'Global rate limit exceeded',
          type: 'global',
          retryAfter: Math.max(globalMin.resetSec, globalDay.resetSec),
          limits: {
            perMinute: globalLimits.perMin,
            perDay: globalLimits.perDay
          }
        });
      }

      // Check per-IP rate limits
      const ipLimits = await getCustomLimits(`ip:${ip}`) || {
        perMin: DEFAULT_LIMITS.IP_PER_MIN,
        perDay: DEFAULT_LIMITS.IP_PER_DAY
      };

      const ipMin = await checkLimit(`ip:${ip}:min`, ipLimits.perMin, 60);
      const ipDay = await checkLimit(`ip:${ip}:day`, ipLimits.perDay, 24 * 3600);

      if (!ipMin.allowed || !ipDay.allowed) {
        return res.status(429).json({
          error: 'IP rate limit exceeded',
          type: 'ip',
          scope: ip,
          retryAfter: Math.max(ipMin.resetSec, ipDay.resetSec),
          limits: {
            perMinute: ipLimits.perMin,
            perDay: ipLimits.perDay
          }
        });
      }

      // Check per-user rate limits (if authenticated)
      if (userId) {
        const userLimits = await getCustomLimits(`user:${userId}`) || {
          perMin: DEFAULT_LIMITS.USER_PER_MIN,
          perDay: DEFAULT_LIMITS.USER_PER_DAY
        };

        const userMin = await checkLimit(`user:${userId}:min`, userLimits.perMin, 60);
        const userDay = await checkLimit(`user:${userId}:day`, userLimits.perDay, 24 * 3600);

        if (!userMin.allowed || !userDay.allowed) {
          return res.status(429).json({
            error: 'User rate limit exceeded',
            type: 'user',
            scope: userId,
            retryAfter: Math.max(userMin.resetSec, userDay.resetSec),
            limits: {
              perMinute: userLimits.perMin,
              perDay: userLimits.perDay
            }
          });
        }
      }

      // Check per-key rate limits (if key is provided)
      if (keyUuid) {
        const keyLimits = await getCustomLimits(`key:${keyUuid}`) || {
          perMin: DEFAULT_LIMITS.USER_PER_MIN,
          perDay: DEFAULT_LIMITS.USER_PER_DAY
        };

        const keyMin = await checkLimit(`key:${keyUuid}:min`, keyLimits.perMin, 60);
        const keyDay = await checkLimit(`key:${keyUuid}:day`, keyLimits.perDay, 24 * 3600);

        if (!keyMin.allowed || !keyDay.allowed) {
          return res.status(429).json({
            error: 'API key rate limit exceeded',
            type: 'key',
            scope: keyUuid,
            retryAfter: Math.max(keyMin.resetSec, keyDay.resetSec),
            limits: {
              perMinute: keyLimits.perMin,
              perDay: keyLimits.perDay
            }
          });
        }
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Global-Limit': globalLimits.perMin.toString(),
        'X-RateLimit-Global-Remaining': globalMin.remaining.toString(),
        'X-RateLimit-Global-Reset': (Date.now() + (globalMin.resetSec * 1000)).toString(),
        'X-RateLimit-IP-Limit': ipLimits.perMin.toString(),
        'X-RateLimit-IP-Remaining': ipMin.remaining.toString(),
        'X-RateLimit-IP-Reset': (Date.now() + (ipMin.resetSec * 1000)).toString()
      });

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Don't block requests if rate limiting fails
      next();
    }
  };
}

/**
 * Admin endpoint to set custom rate limits
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Function} Express route handler
 */
export function createRateLimitAdmin(pool) {
  return {
    // GET /admin/rate-limits - List all rate limits
    async list(req, res) {
      try {
        const result = await pool.query(`
          SELECT scope, max_per_min, max_per_day
          FROM rate_limits
          ORDER BY scope
        `);
        res.json(result.rows);
      } catch (error) {
        console.error('Error fetching rate limits:', error);
        res.status(500).json({ error: 'Failed to fetch rate limits' });
      }
    },

    // POST /admin/rate-limits - Create or update rate limit
    async upsert(req, res) {
      try {
        const { scope, maxPerMin, maxPerDay } = req.body;

        if (!scope || (!maxPerMin && !maxPerDay)) {
          return res.status(400).json({
            error: 'scope and at least one of maxPerMin or maxPerDay are required'
          });
        }

        const result = await pool.query(`
          INSERT INTO rate_limits (scope, max_per_min, max_per_day)
          VALUES ($1, $2, $3)
          ON CONFLICT (scope) DO UPDATE SET
            max_per_min = COALESCE($2, rate_limits.max_per_min),
            max_per_day = COALESCE($3, rate_limits.max_per_day)
          RETURNING *
        `, [scope, maxPerMin || null, maxPerDay || null]);

        res.json(result.rows[0]);
      } catch (error) {
        console.error('Error setting rate limit:', error);
        res.status(500).json({ error: 'Failed to set rate limit' });
      }
    },

    // DELETE /admin/rate-limits/:scope - Remove rate limit
    async remove(req, res) {
      try {
        const { scope } = req.params;
        const result = await pool.query(
          'DELETE FROM rate_limits WHERE scope = $1 RETURNING *',
          [scope]
        );

        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Rate limit not found' });
        }

        res.json({ message: 'Rate limit removed', scope });
      } catch (error) {
        console.error('Error removing rate limit:', error);
        res.status(500).json({ error: 'Failed to remove rate limit' });
      }
    }
  };
}

