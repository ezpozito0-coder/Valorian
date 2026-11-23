import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, '../../logs');

let dbPoolRef = null;

export function bindAuditDb(pool) {
  dbPoolRef = pool;
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Registra eventos de seguridad y errores en archivo local diario y en MySQL (si está conectado).
 */
export async function logAudit({
  eventType,
  severity = 'INFO',
  userId = null,
  ip = null,
  userAgent = null,
  details = {}
}) {
  const entry = {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    userId,
    ip,
    userAgent: userAgent ? String(userAgent).slice(0, 250) : null,
    details
  };

  try {
    ensureLogDir();
    const day = entry.timestamp.slice(0, 10);
    const logPath = path.join(LOG_DIR, `audit-${day}.jsonl`);
    fs.appendFile(logPath, JSON.stringify(entry) + '\n', () => {});
  } catch {
    // No interrumpir flujo si el disco no permite escribir logs
  }

  if (dbPoolRef) {
    try {
      await dbPoolRef.execute(
        `INSERT INTO audit_logs (event_type, severity, user_id, ip_address, user_agent, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          String(eventType).slice(0, 64),
          severity,
          userId,
          ip ? String(ip).slice(0, 64) : null,
          entry.userAgent,
          JSON.stringify(details)
        ]
      );
    } catch {
      // Silencioso para evitar bucles de error si MySQL está caído
    }
  }
}
