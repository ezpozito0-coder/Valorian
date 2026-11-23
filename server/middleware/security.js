import { verifyToken } from '../utils/crypto.js';
import { logAudit } from '../utils/auditLogger.js';

const rateBuckets = new Map();

/**
 * Cabeceras de seguridad HTTP (ISO 27001 / OWASP).
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'"
    ].join('; ')
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/**
 * Limitador de tasa en memoria por IP para prevenir fuerza bruta y DoS básico.
 */
export function rateLimiter({ windowMs = 60_000, maxRequests = 120, bucketName = 'api' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${bucketName}:${ip}`;
    const now = Date.now();
    let entry = rateBuckets.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateBuckets.set(key, entry);
    }

    entry.count += 1;
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));

    if (entry.count > maxRequests) {
      logAudit({
        eventType: 'RATE_LIMIT_EXCEEDED',
        severity: 'SECURITY',
        ip,
        userAgent: req.get('user-agent'),
        details: { bucketName, path: req.originalUrl }
      });
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Espera un momento antes de intentarlo de nuevo.'
      });
    }

    next();
  };
}

/**
 * Detecta patrones sospechosos de inyección SQL o XSS en entradas de texto.
 */
const SUSPICIOUS_PATTERN = /(<\s*script|javascript:|union\s+select|drop\s+table|--\s|;\s*delete\s+from)/i;

export function inspectSuspiciousInput(req, res, next) {
  try {
    const serialized = JSON.stringify({ query: req.query, body: req.body });
    if (serialized && SUSPICIOUS_PATTERN.test(serialized)) {
      logAudit({
        eventType: 'SUSPICIOUS_PAYLOAD',
        severity: 'SECURITY',
        ip: req.ip || req.socket?.remoteAddress,
        userAgent: req.get('user-agent'),
        details: { path: req.originalUrl, method: req.method }
      });
      return res.status(400).json({
        error: 'Solicitud rechazada por contener caracteres o patrones no permitidos.'
      });
    }
  } catch {
    // Continuar si el cuerpo no es serializable
  }
  next();
}

/**
 * Extrae y valida token JWT/HMAC de cookie HttpOnly o cabecera Authorization.
 */
export function requireAuth(req, res, next) {
  let token = null;
  const authHeader = req.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('cdf_session='));
    if (match) token = decodeURIComponent(match.slice('cdf_session='.length));
  }

  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'Sesión no válida o expirada. Inicia sesión nuevamente.' });
  }

  req.user = {
    id: Number(payload.sub),
    username: payload.username,
    role: payload.role || 'player'
  };
  next();
}
