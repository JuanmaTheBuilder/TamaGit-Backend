const crypto = require('crypto');

function githubAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: process.env.GITHUB_SCOPE || 'read:user user:email',
    state,
    allow_signup: 'true',
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

function randomState() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { githubAuthorizeUrl, randomState };