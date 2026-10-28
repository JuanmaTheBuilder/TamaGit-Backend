function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function isAppLink(link) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(link) && !/^https?:\/\//i.test(link);
}

// Sin `package`: Android resuelve el esquema con la app que lo registre (Expo Go o la build)
// y no cae a Play Store si el paquete asumido no coincide.
function androidIntentUrl(link) {
  const match = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i.exec(link);
  if (!match) return link;
  return `intent://${match[2]}#Intent;scheme=${match[1]};end`;
}

function page(body) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Tamagit</title></head>
<body style="font-family:sans-serif;text-align:center;padding:48px 16px">${body}</body></html>`;
}

const buttonStyle =
  'display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none';

function appRedirectPage(link, userAgent = '') {
  const target = /android/i.test(userAgent) ? androidIntentUrl(link) : link;
  const js = JSON.stringify(target).replace(/</g, '\\u003c');
  return page(`<p>Sesión iniciada. Volviendo a Tamagit…</p>
<p><a href="${escapeHtml(target)}" style="${buttonStyle}">Abrir Tamagit</a></p>
<script>window.location.href = ${js};</script>`);
}

function usedCodePage() {
  return page(`<p>Este enlace de inicio de sesión ya se usó.</p>
<p>Si ya iniciaste sesión, cierra esta ventana y vuelve a Tamagit. Si no, inténtalo de nuevo desde la app.</p>`);
}

module.exports = { appRedirectPage, usedCodePage, isAppLink };
