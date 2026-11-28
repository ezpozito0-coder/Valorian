import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { initDatabase, isDbConnected } from './db.js';
import {
  securityHeaders,
  rateLimiter,
  inspectSuspiciousInput
} from './middleware/security.js';
import { logAudit } from './utils/auditLogger.js';
import authRoutes from './routes/auth.js';
import savesRoutes from './routes/saves.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PORT = Number(process.env.PORT || 3000);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(inspectSuspiciousInput);

// API con rate limiting
app.use('/api', rateLimiter({ windowMs: 60_000, maxRequests: 120, bucketName: 'api' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Crónicas de la Fractura',
    vendor: 'TG Legacy S.A.S.',
    cloudDb: isDbConnected(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/saves', savesRoutes);

// Ayudante local para guardar reportes de los 4 personajes IA directamente en mejoras_npc.md
const MEJORAS_NPC_FILE = path.resolve(__dirname, '../mejoras_npc.md');

app.post('/api/npc-report', async (req, res) => {
  try {
    const {
      characterName = 'Personaje IA',
      faction = 'Valoria',
      role = 'Habitante',
      category = 'Deseo propio',
      mapName = 'Valoria',
      suggestion = '',
      technicalNote = ''
    } = req.body || {};

    if (!suggestion || typeof suggestion !== 'string') {
      return res.status(400).json({ error: 'Sugerencia vacía.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const entry = [
      `\n## [${now}] ${characterName} (${role} · ${faction})`,
      `- **Categoría:** ${category}`,
      `- **Ubicación:** ${mapName}`,
      `- **Reporte del Personaje:** "${suggestion.trim()}"`,
      technicalNote ? `- **Nota para Antigravity / Nano Banana:** ${technicalNote.trim()}` : null,
      ''
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await fs.access(MEJORAS_NPC_FILE);
    } catch {
      const header = `# Reportes y Sugerencias de los Personajes IA de Valoria (mejoras_npc.md)\n\nEste archivo es actualizado automáticamente por los 4 personajes principales (**Lyra — Guerrera Paladín**, **Kaelen — Explorador**, **Grommash — Guerrero de Hierro** y **Zul'jinra — Chamana del Clan**) mediante Gemini Flash y el motor local mientras viven en el mundo.\n`;
      await fs.writeFile(MEJORAS_NPC_FILE, header, 'utf8');
    }

    await fs.appendFile(MEJORAS_NPC_FILE, entry, 'utf8');
    res.json({ status: 'saved', file: 'mejoras_npc.md', timestamp: now });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo escribir en mejoras_npc.md', details: err?.message });
  }
});

app.get('/api/npc-reports', async (_req, res) => {
  try {
    const content = await fs.readFile(MEJORAS_NPC_FILE, 'utf8');
    res.json({ status: 'ok', content });
  } catch {
    res.json({ status: 'ok', content: '' });
  }
});

app.get('/api/gemini-config', (_req, res) => {
  res.json({ apiKey: process.env.GEMINI_API_KEY || '' });
});

// Archivos estáticos con caché inteligente
app.use(
  express.static(PUBLIC_DIR, {
    etag: true,
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
  })
);

// Fallback SPA para navegación con History API
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Recurso de API no encontrado.' });
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Manejador centralizado de errores (ISO 25010 / ISO 27001)
app.use((err, req, res, _next) => {
  logAudit({
    eventType: 'UNHANDLED_SERVER_ERROR',
    severity: 'ERROR',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    details: { message: err?.message || 'Error desconocido', path: req.originalUrl }
  });
  res.status(500).json({
    error: 'Ocurrió un error inesperado en el servidor. Tu progreso local sigue protegido.'
  });
});

async function start() {
  await initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n⚔️  Crónicas de la Fractura (TG Legacy S.A.S.)`);
    console.log(`   Servidor activo en: http://localhost:${PORT}`);
    console.log(`   Estado MySQL nube:  ${isDbConnected() ? 'CONECTADO' : 'MODO OFFLINE-FIRST (sin .env MySQL)'}\n`);
  });
}

start();
