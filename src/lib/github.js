const crypto = require('crypto');

function resolveCallbackUrl(req) {
  if (process.env.GITHUB_CALLBACK_URL) return process.env.GITHUB_CALLBACK_URL;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost:3000';
  return `${protocol}://${host}/auth/github/callback`;
}

function githubAuthorizeUrl(state, redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: process.env.GITHUB_SCOPE || 'read:user user:email',
    state,
    allow_signup: 'true',
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

function randomState() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { githubAuthorizeUrl, randomState, resolveCallbackUrl };