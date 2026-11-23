# Crónicas de la Fractura

RPG 2D Pixel Art de 16 bits (vista top-down 2.5D) ambientado en el continente de **Valoria**, compatible con celulares, tablets y PC, con arquitectura **Offline-First (PWA + IndexedDB)** y sincronización automática con **MySQL en la nube**.

© 2026 **TG Legacy S.A.S.** Todos los derechos reservados.

---

## Características principales
- **Diseño Visual (Fase 1):** Paleta oficial de La Guardia del Alba, Los Clanes de Hierro y El Vacío; tipografía `Pixelify Sans` + `Inter`; logo *La Espada en la Grieta* y Modo Claro / Modo Oscuro.
- **Mundo y Combate 16-bit:** Aldea Segura (Tabernero, Herrero, Muñeco de Entrenamiento), Bosque de la Fractura (Lobos Corruptos) y Cueva del Vacío (Trasgos Sombríos, Cristales Morados, Esqueletos del Vacío y el jefe final **Malakor, el Guardián Caído**).
- **3 Clases Jugables:** Guerrero (Espada y Escudo), Mago (Bastón) y Arquero (Arco), cada una con ataque básico y 3 habilidades activas.
- **5 Misiones + Mochila de 16 espacios + Forja (+1 a +5).**
- **Controles Multiplataforma:** Palanca virtual táctil + 4 botones grandes en celular/tablet y teclado (`WASD`, `Espacio`, `1/2/3`, `E`, `Q`, `I`, `Esc`) en PC.
- **Navegación con Historial Real:** History API (`pushState` / `popstate`) para usar Atrás y Adelante sin cerrar la aplicación.
- **Seguridad y Estándares ISO:** Controles alineados a ISO/IEC 27001 e ISO/IEC 25010 (ver `docs/SECURITY_ISO.md`).

---

## Inicio rápido

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. (Opcional para sincronización en la nube) Copiar `.env.example` a `.env` y completar tus credenciales MySQL:
   ```bash
   copy .env.example .env
   ```
3. Iniciar el servidor:
   ```bash
   npm start
   ```
4. Abrir en el navegador: `http://localhost:3000`

### Copias de seguridad MySQL
```bash
npm run db:backup
```
