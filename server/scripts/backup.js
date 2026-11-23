import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase, getPool } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 7);

async function runBackup() {
  const pool = await initDatabase();
  if (!pool) {
    console.error('[Backup] No hay conexión a MySQL configurada. Revisa tu archivo .env.');
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(BACKUP_DIR, `backup-${stamp}.json`);

  const [users] = await pool.query('SELECT id, username, email, role, created_at FROM users');
  const [saves] = await pool.query('SELECT * FROM game_saves');
  const [logs] = await pool.query(
    'SELECT * FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    database: process.env.MYSQL_DATABASE,
    tables: {
      users,
      game_saves: saves,
      audit_logs: logs
    }
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[Backup] Copia creada correctamente: ${outFile}`);

  // Limpiar copias antiguas según política de retención
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(BACKUP_DIR)) {
    if (!file.startsWith('backup-') || !file.endsWith('.json')) continue;
    const full = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(full);
      console.log(`[Backup] Eliminada copia vencida: ${file}`);
    }
  }

  await pool.end();
}

runBackup().catch((err) => {
  console.error('[Backup] Error:', err);
  process.exit(1);
});
