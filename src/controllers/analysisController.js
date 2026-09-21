const prisma = require('../lib/prisma');
const {
  loadCommitDetails,
  scoreCommit,
  deltaFromScore,
  applyBranchRule,
  tierFromScore,
} = require('../lib/commitAnalysis');
const { commitChanges } = require('../lib/petStats');
const { memberOf } = require('../lib/membership');
const groq = require('../lib/groq');

const DISHES_LIMIT = 30;

async function projectAccess(projectId, user) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: { status: 404, error: 'Proyecto no encontrado' } };

  if (project.ownerId === user.id || user.isAdmin) return { project };

  const member = await memberOf(project.id, user.id);
  if (!member) return { error: { status: 403, error: 'No tienes permiso para este proyecto' } };

  return { project };
}

async function branchCommits(token, fullName, branch, since) {
  try {
    const chunk = await loadCommitDetails(token, fullName, branch);
    return (chunk || [])
      .filter((c) => {
        const d = c.commit?.author?.date ? new Date(c.commit.author.date) : null;
        return d && d >= since;
      })
      .map((c) => ({ commit: c, branch }));
  } catch {
    return [];
  }
}

const analyze = async (req, res) => {
  const projectId = Number(req.params.projectId);

  try {
    const { project, error } = await projectAccess(projectId, req.user);
    if (error) return res.status(error.status).json({ error: error.error });

    if (!req.user.githubAccessToken) {
      return res.status(401).json({ error: 'Este usuario no tiene token de GitHub vigente. Vuelve a iniciar sesión.' });
    }

    const pet = await prisma.pet.findUnique({ where: { projectId: project.id } });
    if (!pet) return res.status(400).json({ error: 'Este proyecto no tiene mascota aún' });

    const since = pet.createdAt;
    const branches = [...new Set([pet.lifeBranch, project.defaultBranch].filter(Boolean))];

    const fetched = [];
    for (const branch of branches) {
      const commits = await branchCommits(req.user.githubAccessToken, project.fullName, branch, since);
      fetched.push(...commits);
    }

    const seen = new Set();
    const unique = [];
    for (const item of fetched) {
      if (!seen.has(item.commit.sha)) {
        seen.add(item.commit.sha);
        unique.push(item);
      }
    }

    const result = [];
    let petAfter = pet;
    let applied = 0;

    for (const { commit, branch } of unique) {
      const existing = await prisma.commitAnalysis.findUnique({
        where: { projectId_sha: { projectId: project.id, sha: commit.sha } },
      });
      if (existing) {
        result.push({ sha: commit.sha, status: 'existe' });
        continue;
      }

      const analysis = scoreCommit(commit);
      const date = commit.commit?.author?.date ? new Date(commit.commit.author.date) : null;

      await prisma.commitAnalysis.create({
        data: {
          projectId: project.id,
          sha: commit.sha,
          message: commit.commit?.message?.split('\n')[0] || '(sin mensaje)',
          author: commit.commit?.author?.name || commit.commit?.committer?.name || null,
          date,
          commitUrl: commit.html_url || null,
          branch,
          score: analysis.score,
          findings: analysis.findings,
          summary: null,
        },
      });

      const isLifeBranch = branch === pet.lifeBranch;
      const delta = applyBranchRule(deltaFromScore(analysis), isLifeBranch);
      petAfter = { ...petAfter, ...commitChanges(petAfter, delta) };
      applied += 1;

      result.push({ sha: commit.sha, status: 'nuevo' });
    }

    if (applied > 0) {
      await prisma.pet.update({
        where: { id: pet.id },
        data: {
          health: petAfter.health,
          hunger: petAfter.hunger,
          happiness: Math.max(0, Math.min(100, petAfter.happiness)),
        },
      });
    }

    // Análisis cualitativo del último commit (el del bocadillo), cacheado por sha.
    // Se genera IA solo si aún no existe summary para ese commit. No toca stats.
    let latest = null;
    try {
      const row = await prisma.commitAnalysis.findFirst({
        where: { projectId: project.id },
        orderBy: { date: 'desc' },
      });
      if (row) {
        let summary = row.summary;
        if (!summary) {
          try {
            summary = await groq.petMessage({
              commit: { message: row.message, branch: row.branch },
              score: row.score,
            });
            if (summary) {
              await prisma.commitAnalysis.update({ where: { id: row.id }, data: { summary } });
            }
          } catch {
            // sin IA o fallo de red: se deja null
          }
        }
        latest = {
          sha: row.sha,
          branch: row.branch ?? '',
          score: row.score,
          message: row.message,
          date: row.date,
          summary,
        };
      }
    } catch {
      // sin análisis aún
    }

    res.json({
      analyzed: unique.length,
      newCommits: result.filter((r) => r.status === 'nuevo').length,
      applied,
      latest,
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo analizar el proyecto', details: err.message });
  }
};

const listAnalyses = async (req, res) => {
  const projectId = Number(req.params.projectId);
  try {
    const { project, error } = await projectAccess(projectId, req.user);
    if (error) return res.status(error.status).json({ error: error.error });

    const analyses = await prisma.commitAnalysis.findMany({
      where: { projectId: project.id },
      orderBy: { date: 'desc' },
      take: DISHES_LIMIT,
    });

    res.json(
      analyses.map((a) => ({
        id: a.id,
        sha: a.sha,
        message: a.message,
        author: a.author,
        date: a.date,
        commitUrl: a.commitUrl,
        branch: a.branch,
        score: a.score,
        findings: a.findings,
        summary: a.summary,
        fedAt: a.fedAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron cargar los análisis', details: err.message });
  }
};

const dishes = async (req, res) => {
  const projectId = Number(req.params.projectId);

  try {
    const { project, error } = await projectAccess(projectId, req.user);
    if (error) return res.status(error.status).json({ error: error.error });

    const rows = await prisma.commitAnalysis.findMany({
      where: { projectId: project.id },
      orderBy: { date: 'desc' },
      take: DISHES_LIMIT,
    });

    const foods = await prisma.food.findMany();
    const foodByTier = { small: null, medium: null, large: null };
    for (const tier of ['small', 'medium', 'large']) {
      foodByTier[tier] = foods.find((f) => f.size === tier) ?? foods[0] ?? null;
    }

    res.json(
      rows.map((a) => {
        const tier = tierFromScore(a.score);
        return {
          commitId: a.id,
          sha: a.sha,
          message: a.message,
          summary: a.summary,
          date: a.date,
          branch: a.branch,
          score: a.score,
          tier,
          fed: Boolean(a.fedAt),
          food: foodByTier[tier],
        };
      })
    );
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron cargar los platillos', details: err.message });
  }
};

module.exports = { analyze, listAnalyses, dishes, DISHES_LIMIT };