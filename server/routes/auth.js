import express from 'express';
import { getPool, isDbConnected } from '../db.js';
import { hashPassword, verifyPassword, signToken } from '../utils/crypto.js';
import { logAudit } from '../utils/auditLogger.js';
import { rateLimiter, requireAuth } from '../middleware/security.js';

const router = express.Router();
const authLimiter = rateLimiter({ windowMs: 15 * 60_000, maxRequests: 25, bucketName: 'auth' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `cdf_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${60 * 60 * 24 * 7}`
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

router.post('/register', authLimiter, async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      error: 'Base de datos en la nube no disponible en este momento. Puedes seguir jugando sin conexión.'
    });
  }

  const username = String(req.body?.username || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!USER_RE.test(username)) {
    return res.status(400).json({
      error: 'El usuario debe tener entre 3 y 32 caracteres (letras, números, _, . o -).'
    });
  }
  if (!EMAIL_RE.test(email) || email.length > 160) {
    return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  try {
    const pool = getPool();
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [email, username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ese usuario o correo ya está registrado.' });
    }

    const passwordHash = await hashPassword(password);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const userId = result.insertId;
    const token = signToken({ sub: userId, username, role: 'player' });
    setSessionCookie(res, token);

    await logAudit({
      eventType: 'USER_REGISTERED',
      severity: 'INFO',
      userId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      details: { username }
    });

    return res.status(201).json({
      user: { id: userId, username, email },
      token
    });
  } catch (err) {
    await logAudit({
      eventType: 'AUTH_REGISTER_ERROR',
      severity: 'ERROR',
      ip: req.ip,
      details: { message: err.message }
    });
    return res.status(500).json({ error: 'No se pudo crear la cuenta. Inténtalo más tarde.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      error: 'Base de datos en la nube no disponible. Tu progreso local sigue seguro.'
    });
  }

  const identifier = String(req.body?.identifier || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Ingresa tu usuario/correo y contraseña.' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, username, email, password_hash, role, failed_attempts, locked_until
       FROM users
       WHERE LOWER(email) = ? OR LOWER(username) = ?
       LIMIT 1`,
      [identifier, identifier]
    );

    if (rows.length === 0) {
      await logAudit({
        eventType: 'LOGIN_FAILED',
        severity: 'SECURITY',
        ip: req.ip,
        userAgent: req.get('user-agent'),
        details: { identifier }
      });
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const user = rows[0];
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({
        error: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta en unos minutos.'
      });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      const nextAttempts = (user.failed_attempts || 0) + 1;
      const lockSql = nextAttempts >= 5 ? 'DATE_ADD(NOW(), INTERVAL 15 MINUTE)' : 'NULL';
      await pool.execute(
        `UPDATE users SET failed_attempts = ?, locked_until = ${lockSql} WHERE id = ?`,
        [nextAttempts, user.id]
      );
      await logAudit({
        eventType: 'LOGIN_FAILED',
        severity: 'SECURITY',
        userId: user.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        details: { attempts: nextAttempts }
      });
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    await pool.execute('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [
      user.id
    ]);

    const token = signToken({ sub: user.id, username: user.username, role: user.role });
    setSessionCookie(res, token);

    await logAudit({
      eventType: 'LOGIN_SUCCESS',
      severity: 'INFO',
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.json({
      user: { id: user.id, username: user.username, email: user.email },
      token
    });
  } catch (err) {
    await logAudit({
      eventType: 'AUTH_LOGIN_ERROR',
      severity: 'ERROR',
      ip: req.ip,
      details: { message: err.message }
    });
    return res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'cdf_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
  res.json({ ok: true });
});

export default router;
