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

const listRepos = async (req, res) => {
  try {
    const repos = await githubFetch('/user/repos?per_page=100&sort=updated', req.user.githubAccessToken);
    const mapped = repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      private: r.private,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(err.status || 500).json({ error: 'No se pudieron cargar los repositorios', details: err.message });
  }
};

const listCommits = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const commits = await githubFetch(
      `/repos/${owner}/${repo}/commits?per_page=50`,
      req.user.githubAccessToken
    );
    const mapped = commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split('\n')[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(err.status || 500).json({ error: 'No se pudieron cargar los commits', details: err.message });
  }
};

module.exports = { listRepos, listCommits };