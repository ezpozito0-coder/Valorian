import express from 'express';
import { getPool, isDbConnected } from '../db.js';
import { computeChecksum } from '../utils/crypto.js';
import { logAudit } from '../utils/auditLogger.js';
import { requireAuth } from '../middleware/security.js';

const router = express.Router();

const VALID_FACTIONS = new Set(['alba', 'hierro']);
const VALID_CLASSES = new Set(['guerrero', 'mago', 'arquero']);

router.get('/', requireAuth, async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Sincronización en la nube temporalmente no disponible.' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT slot_key, character_name, faction, race, hero_class, save_payload, checksum, client_updated_at
       FROM game_saves
       WHERE user_id = ?
       ORDER BY client_updated_at DESC`,
      [req.user.id]
    );
    return res.json({ saves: rows });
  } catch (err) {
    await logAudit({
      eventType: 'SAVE_LIST_ERROR',
      severity: 'ERROR',
      userId: req.user.id,
      details: { message: err.message }
    });
    return res.status(500).json({ error: 'No se pudieron recuperar las partidas guardadas.' });
  }
});

/**
 * Sincronización bidireccional offline-first:
 * Compara client_updated_at contra la nube y conserva la versión más reciente.
 */
router.post('/sync', requireAuth, async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Base de datos en la nube no disponible.' });
  }

  const slotKey = String(req.body?.slotKey || 'primary').slice(0, 64);
  const saveData = req.body?.saveData;
  const clientUpdatedAt = Number(req.body?.updatedAt || Date.now());

  if (!saveData || typeof saveData !== 'object') {
    return res.status(400).json({ error: 'Datos de partida inválidos.' });
  }

  const characterName = String(saveData.name || 'Héroe').trim().slice(0, 40);
  const faction = VALID_FACTIONS.has(saveData.faction) ? saveData.faction : 'alba';
  const race = String(saveData.race || 'Humano').slice(0, 32);
  const heroClass = VALID_CLASSES.has(saveData.heroClass) ? saveData.heroClass : 'guerrero';

  const serialized = JSON.stringify(saveData);
  if (serialized.length > 65_536) {
    return res.status(413).json({ error: 'El archivo de guardado excede el límite permitido.' });
  }

  try {
    const pool = getPool();
    const [existingRows] = await pool.execute(
      'SELECT save_payload, client_updated_at FROM game_saves WHERE user_id = ? AND slot_key = ? LIMIT 1',
      [req.user.id, slotKey]
    );

    if (existingRows.length > 0 && Number(existingRows[0].client_updated_at) > clientUpdatedAt) {
      const cloudSave =
        typeof existingRows[0].save_payload === 'string'
          ? JSON.parse(existingRows[0].save_payload)
          : existingRows[0].save_payload;
      return res.json({
        resolution: 'cloud_newer',
        updatedAt: Number(existingRows[0].client_updated_at),
        saveData: cloudSave
      });
    }

    const checksum = computeChecksum(serialized);
    await pool.execute(
      `INSERT INTO game_saves
        (user_id, slot_key, character_name, faction, race, hero_class, save_payload, checksum, client_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        character_name = VALUES(character_name),
        faction = VALUES(faction),
        race = VALUES(race),
        hero_class = VALUES(hero_class),
        save_payload = VALUES(save_payload),
        checksum = VALUES(checksum),
        client_updated_at = VALUES(client_updated_at)`,
      [
        req.user.id,
        slotKey,
        characterName,
        faction,
        race,
        heroClass,
        serialized,
        checksum,
        clientUpdatedAt
      ]
    );

    return res.json({
      resolution: 'synced',
      updatedAt: clientUpdatedAt,
      checksum
    });
  } catch (err) {
    await logAudit({
      eventType: 'SAVE_SYNC_ERROR',
      severity: 'ERROR',
      userId: req.user.id,
      details: { message: err.message }
    });
    return res.status(500).json({ error: 'Error al sincronizar la partida con la nube.' });
  }
});

router.delete('/:slotKey', requireAuth, async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Base de datos en la nube no disponible.' });
  }
  const slotKey = String(req.params.slotKey || '').slice(0, 64);
  if (!['slot_1', 'slot_2', 'slot_3', 'primary'].includes(slotKey)) {
    return res.status(400).json({ error: 'Espacio de personaje inválido.' });
  }
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM game_saves WHERE user_id = ? AND slot_key = ?', [
      req.user.id,
      slotKey
    ]);
    return res.json({ deleted: true, slotKey });
  } catch (err) {
    await logAudit({
      eventType: 'SAVE_DELETE_ERROR',
      severity: 'ERROR',
      userId: req.user.id,
      details: { message: err.message }
    });
    return res.status(500).json({ error: 'No se pudo eliminar el personaje en la nube.' });
  }
});

export default router;
