import jwt from 'jsonwebtoken';

// JWT Hardening (Task 1.14)
// Enforces issuer, audience, exp, nbf; prepares for key rotation (kid header) and role claims.

const ISSUER = process.env.JWT_ISSUER || 'ai-automation-platform';
const AUDIENCE = process.env.JWT_AUDIENCE || 'ai-automation-clients';
const ALLOWED_CLOCK_SKEW = parseInt(process.env.JWT_CLOCK_SKEW || '5', 10); // seconds

// Simple in-memory key cache (future: JWKS fetch)
const keyStore = {
  getKey() {
    // For now single secret; could branch on kid later.
    return process.env.JWT_SECRET || 'dev_secret';
  }
};

export function authenticateToken(req, res, next) {
  const auth = req.header('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });
  let decoded;
  try {
  decoded = jwt.verify(token, (header, cb) => {
      try {
    const secret = keyStore.getKey(header.kid);
        cb(null, secret);
      } catch (e) {
        cb(e);
      }
    }, {
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: ALLOWED_CLOCK_SKEW
    });
  } catch (e) {
    const msg = e.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token';
    return res.status(401).json({ error: msg });
  }
  // Basic mandatory claims validation
  if (!decoded.sub) return res.status(401).json({ error: 'invalid_subject' });
  req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
  next();
}

// Flexible variant for transports that cannot set headers (e.g., EventSource)
// Accepts token from:
// - Authorization: Bearer <token>
// - query parameter: ?token=...
// - X-Chat-Token header
export function authenticateTokenFlexible(req, res, next) {
  const auth = req.header('Authorization') || '';
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const queryToken = req.query?.token || null;
  const altHeaderToken = req.header('X-Chat-Token') || null;
  const token = headerToken || queryToken || altHeaderToken;
  if (!token) return res.status(401).json({ error: 'missing_token' });
  let decoded;
  try {
    decoded = jwt.verify(token, (header, cb) => {
      try {
        const secret = keyStore.getKey(header.kid);
        cb(null, secret);
      } catch (e) {
        cb(e);
      }
    }, {
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: ALLOWED_CLOCK_SKEW
    });
  } catch (e) {
    const msg = e.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token';
    return res.status(401).json({ error: msg });
  }
  if (!decoded.sub) return res.status(401).json({ error: 'invalid_subject' });
  req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
  next();
}

export function requireRole(role) {
  return function (req, res, next) {
    if (!req.user || req.user.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
