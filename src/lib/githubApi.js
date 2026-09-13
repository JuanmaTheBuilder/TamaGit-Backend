async function githubFetch(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'tamagit-backend',
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    const error = new Error(`GitHub API ${res.status}: ${res.statusText}`);
    error.status = res.status;
    throw error;
  }

  return res.json();
}

async function listUserRepos(token) {
  const repos = [];
  let page = 1;
  let chunk = [];

  do {
    chunk = await githubFetch(`/user/repos?per_page=100&sort=updated&page=${page}`, token);
    repos.push(...chunk);
    page += 1;
  } while (chunk.length === 100);

  return repos;
}

async function getRepoTree(token, fullName, branch) {
  const tree = await githubFetch(`/repos/${fullName}/git/trees/${branch}?recursive=1`, token);
  return (tree.tree || []).map((entry) => entry.path);
}

module.exports = { githubFetch, listUserRepos, getRepoTree };