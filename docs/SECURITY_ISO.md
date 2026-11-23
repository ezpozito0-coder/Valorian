# Estándares de Seguridad y Calidad — Crónicas de la Fractura

**Titular:** TG Legacy S.A.S.  
**Normas de referencia:** ISO/IEC 27001 (Seguridad de la Información) e ISO/IEC 25010 (Calidad de Producto de Software).

## 1. Controles de Seguridad (ISO/IEC 27001)
- **Prevención de Inyección SQL:** Todas las consultas en `server/routes/` y `server/db.js` utilizan sentencias preparadas parametrizadas (`mysql2` con `?`).
- **Cifrado de Contraseñas:** Algoritmo `scrypt` (sal aleatoria de 16 bytes por usuario, clave derivada de 64 bytes) con comparación en tiempo constante (`crypto.timingSafeEqual`).
- **Sesiones Seguras:** Tokens firmados con `HMAC-SHA256`, almacenados en cookies `HttpOnly; SameSite=Strict` (y `Secure` en producción).
- **Protección contra Fuerza Bruta y Abuso:**
  - Limitador de tasa por IP (`rateLimiter`) en API general y rutas de autenticación.
  - Bloqueo temporal de cuenta (15 min) tras 5 intentos fallidos consecutivos.
- **Cabeceras HTTP y Mitigación XSS:** `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, desactivación de `X-Powered-By`, e inspección de patrones sospechosos (`inspectSuspiciousInput`).
- **Auditoría y Registro:** Eventos de seguridad, intentos fallidos, payloads sospechosos y errores internos se registran en `logs/audit-YYYY-MM-DD.jsonl` y en la tabla `audit_logs` de MySQL.
- **Copias de Seguridad:** Script automatizado `npm run db:backup` (`server/scripts/backup.js`) con retención configurable (`BACKUP_RETENTION_DAYS`).

## 2. Atributos de Calidad (ISO/IEC 25010)
- **Fiabilidad y Disponibilidad (Offline-First):** Persistencia local inmediata en IndexedDB + `localStorage` y Service Worker (`public/sw.js`). Al recuperar conexión, sincronización automática con resolución de conflictos por marca de tiempo (`client_updated_at`) y verificación de integridad `SHA-256`.
- **Usabilidad y Portabilidad:** Interfaz adaptable a Android, iOS, Windows, macOS y Linux; controles táctiles virtuales y teclado PC; Modo Claro/Oscuro y navegación con historial real del navegador.
- **Mantenibilidad:** Arquitectura modular separando motor 2D, datos del juego, sprites procedurales, almacenamiento, enrutador y backend REST.
