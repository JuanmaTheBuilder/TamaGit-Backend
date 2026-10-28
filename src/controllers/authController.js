const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const { githubAuthorizeUrl, randomState, resolveCallbackUrl } = require('../lib/github');

const login = (req, res) => {
  const redirectUri = typeof req.query.redirect_uri === 'string' ? req.query.redirect_uri.trim() : '';
  const state = redirectUri
    ? jwt.sign({ redirect: redirectUri }, process.env.JWT_SECRET, { expiresIn: '10m' })
    : randomState();
  res.redirect(githubAuthorizeUrl(state, resolveCallbackUrl(req)));
};

const tokenResponse = async (req, res) => {
  res.setHeader('Cache-Control', 'private, max-age=0');
  try {
    const code = req.query.code;

    let deepLink = '';
    const state = req.query.state;
    if (typeof state === 'string' && state.includes('.')) {
      try {
        const decoded = jwt.verify(state, process.env.JWT_SECRET);
        if (decoded && typeof decoded.redirect === 'string') deepLink = decoded.redirect;
      } catch {
        deepLink = '';
      }
    }

    if (req.query.error || !code) {
      return res.status(400).json({ error: 'OAuth cancelado o inválido' });
    }

    const callbackUrl = resolveCallbackUrl(req);
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'No se pudo obtener el token de GitHub', details: tokenData });
    }

    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'tamagit-backend',
        Accept: 'application/vnd.github+json',
      },
    });
    const profile = await profileRes.json();

    if (!profile.id) {
      return res.status(401).json({ error: 'No se pudo obtener el perfil de GitHub' });
    }

    const user = await prisma.user.upsert({
      where: { githubId: profile.id },
      update: {
        githubUsername: profile.login,
        name: profile.name || profile.login,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        githubAccessToken: tokenData.access_token,
      },
      create: {
        githubId: profile.id,
        githubUsername: profile.login,
        name: profile.name || profile.login,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        githubAccessToken: tokenData.access_token,
      },
    });

    if (user.isBanned) {
      return res.status(403).json({ error: 'Tu cuenta está suspendida' });
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || '30d',
    });

    const targetLink = deepLink || process.env.TAMAGIT_DEEP_LINK;
    if (targetLink && req.query.json !== '1') {
      const query = new URLSearchParams({
        token,
        username: user.githubUsername || '',
        avatar: user.avatarUrl || '',
      });
      const target = `${targetLink}?${query.toString()}`;
      if (/^https?:\/\//i.test(targetLink)) return res.redirect(target);
      return res.type('html').send(appRedirectPage(target));
    }

    return res.json({ token, user: safeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: 'Error en el callback de OAuth', details: err.message });
  }
};

function appRedirectPage(target) {
  const href = target.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const js = JSON.stringify(target).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Volver a Tamagit</title></head>
<body style="font-family:sans-serif;text-align:center;padding:48px 16px">
<p>Sesión iniciada. Volviendo a Tamagit…</p>
<p><a href="${href}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Abrir Tamagit</a></p>
<script>window.location.href = ${js};</script></body></html>`;
}

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    githubId: user.githubId,
    githubUsername: user.githubUsername,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
  };
}

module.exports = { login, tokenResponse, safeUser };
