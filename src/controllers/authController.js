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
      return res.redirect(`${targetLink}?${query.toString()}`);
    }

    return res.json({ token, user: safeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: 'Error en el callback de OAuth', details: err.message });
  }
};

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    githubId: user.githubId,
    githubUsername: user.githubUsername,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

module.exports = { login, tokenResponse, safeUser };
