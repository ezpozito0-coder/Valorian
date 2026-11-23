/**
 * Marco Legal oficial — TG Legacy S.A.S.
 */

export const LEGAL_DOCS = {
  privacy: {
    title: 'Política de Privacidad',
    html: `
      <p><strong>Titular:</strong> TG Legacy S.A.S. · <strong>Última actualización:</strong> 2026</p>
      <h4>1. Datos que recopilamos</h4>
      <p>En <strong>Crónicas de la Fractura</strong> recopilamos únicamente los datos estrictamente necesarios para ofrecer el servicio: nombre de usuario, correo electrónico (si decides crear una cuenta en la nube) y el progreso de tu personaje en Valoria.</p>
      <h4>2. Almacenamiento Local y Nube</h4>
      <p>Puedes jugar completamente sin conexión mediante almacenamiento local (IndexedDB). Si inicias sesión, tu progreso se sincroniza de forma cifrada con nuestra base de datos MySQL en la nube.</p>
      <h4>3. Seguridad de la Información (ISO/IEC 27001)</h4>
      <p>Las contraseñas se protegen mediante derivación criptográfica irreversible (<code>scrypt</code> con sal aleatoria), las consultas utilizan parámetros preparados y se registran auditorías internas de accesos anómalos.</p>
      <h4>4. Derechos del Titular</h4>
      <p>Puedes solicitar el acceso, rectificación o eliminación de tu cuenta y datos personales contactando a TG Legacy S.A.S. a través de los canales oficiales de soporte.</p>
    `
  },
  cookies: {
    title: 'Política de Cookies',
    html: `
      <p><strong>Titular:</strong> TG Legacy S.A.S.</p>
      <h4>1. Qué son las cookies y el almacenamiento local</h4>
      <p>Son pequeños archivos que el navegador guarda en tu dispositivo para recordar tus preferencias y permitir que la aplicación funcione sin conexión a internet.</p>
      <h4>2. Cookies que utilizamos</h4>
      <p>• <strong>Cookies técnicas esenciales (HttpOnly / SameSite=Strict):</strong> mantienen tu sesión autenticada de forma segura cuando sincronizas con la nube.<br/>
      • <strong>Almacenamiento local (IndexedDB / localStorage):</strong> guarda tu partida, tema Claro/Oscuro y preferencias de audio para jugar offline.</p>
      <h4>3. Sin rastreadores publicitarios</h4>
      <p>Esta aplicación no utiliza cookies de terceros con fines publicitarios ni vende información de comportamiento.</p>
    `
  },
  terms: {
    title: 'Términos y Condiciones',
    html: `
      <p><strong>Titular:</strong> TG Legacy S.A.S.</p>
      <h4>1. Licencia de uso</h4>
      <p>TG Legacy S.A.S. te concede una licencia personal, no exclusiva e intransferible para jugar <strong>Crónicas de la Fractura</strong> en dispositivos compatibles (móvil, tablet y PC).</p>
      <h4>2. Propiedad Intelectual</h4>
      <p>El código fuente, los diseños visuales, el logo "La Espada en la Grieta", los textos y el universo de Valoria son propiedad exclusiva de <strong>TG Legacy S.A.S.</strong></p>
      <h4>3. Conducta y Seguridad</h4>
      <p>Queda prohibido intentar vulnerar el servidor, alterar solicitudes de API, realizar ataques automatizados o usar cuentas de terceros sin autorización. Cualquier actividad sospechosa podrá quedar registrada y derivar en suspensión.</p>
    `
  },
  legal: {
    title: 'Aviso Legal y Estándares',
    html: `
      <p><strong>Razón Social:</strong> TG Legacy S.A.S.</p>
      <p><strong>Aplicación:</strong> Crónicas de la Fractura (v1.0.0)</p>
      <h4>Cumplimiento Técnico y de Calidad</h4>
      <p>Este software ha sido diseñado siguiendo lineamientos de <strong>ISO/IEC 27001</strong> (seguridad de la información, control de acceso, cifrado, copias de seguridad y auditoría) e <strong>ISO/IEC 25010</strong> (usabilidad, fiabilidad offline-first, portabilidad multiplataforma y rendimiento).</p>
      <p>© 2026 TG Legacy S.A.S. Todos los derechos reservados.</p>
    `
  }
};
