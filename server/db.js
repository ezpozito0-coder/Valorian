import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { bindAuditDb, logAudit } from './utils/auditLogger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;
let dbConnected = false;

export async function initDatabase() {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    console.warn('[DB] Variables MYSQL_* no configuradas. El servidor operará en modo local/offline-first.');
    return null;
  }

  try {
    pool = mysql.createPool({
      host,
      port: Number(process.env.MYSQL_PORT || 3306),
      user,
      password: process.env.MYSQL_PASSWORD || '',
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      namedPlaceholders: false,
      ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: true } : undefined
    });

    const conn = await pool.getConnection();
    await conn.ping();

    // Ejecutar schema.sql sentencia por sentencia para asegurar tablas
    const schemaPath = path.join(__dirname, 'schema.sql');
    const rawSql = fs.readFileSync(schemaPath, 'utf8');
    const statements = rawSql
      .split(/;\s*\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      await conn.query(stmt);
    }

    conn.release();
    dbConnected = true;
    bindAuditDb(pool);
    console.log(`[DB] Conectado a MySQL (${host}:${process.env.MYSQL_PORT || 3306}/${database}).`);
    return pool;
  } catch (err) {
    dbConnected = false;
    pool = null;
    console.warn(`[DB] No se pudo conectar a MySQL (${err.message}). El juego sigue disponible en modo local/offline.`);
    await logAudit({
      eventType: 'DB_CONNECTION_ERROR',
      severity: 'ERROR',
      details: { message: err.message }
    });
    return null;
  }
}

export function getPool() {
  return pool;
}

export function isDbConnected() {
  return dbConnected && pool !== null;
}
