/**
 * Enrutador con History API real del navegador/dispositivo.
 * Permite usar los botones Atrás y Adelante entre pantallas y modales sin cerrar la app.
 */

const listeners = new Set();

function parseHash() {
  const raw = (window.location.hash || '#inicio').replace(/^#/, '');
  const [route, param] = raw.split('/');
  return { route: route || 'inicio', param: param || null };
}

export function getCurrentRoute() {
  return parseHash();
}

export function navigate(route, param = null, { replace = false } = {}) {
  const hash = param ? `#${route}/${param}` : `#${route}`;
  const state = { route, param };
  if (replace) {
    window.history.replaceState(state, '', hash);
  } else if (window.location.hash !== hash) {
    window.history.pushState(state, '', hash);
  }
  notify(state);
}

export function onRouteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(state) {
  for (const fn of listeners) {
    fn(state);
  }
}

export function initRouter() {
  if (!window.location.hash) {
    window.history.replaceState({ route: 'inicio', param: null }, '', '#inicio');
  }
  window.addEventListener('popstate', () => {
    notify(parseHash());
  });
  notify(parseHash());
}
