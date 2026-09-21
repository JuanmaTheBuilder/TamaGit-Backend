const prisma = require('../lib/prisma');
const { loadCommitDetails, scoreCommit, deltaFromScore, applyBranchRule } = require('../lib/commitAnalysis');
const { withLiveStats, commitChanges } = require('../lib/petStats');
const { memberOf } = require('../lib/membership');
const groq = require('../lib/groq');

const ANALYSES_LIMIT = 25;

async function projectAccess(projectId, user) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: { status: 404, error: 'Proyecto no encontrado' } };

  if (project.ownerId === user.id || user.isAdmin) return { project };

  const member = await memberOf(project.id, user.id);
  if (!member) return { error: { status: 403, error: 'No tienes permiso para este proyecto' } };

  return { project };
}

async function fetchPerBranch(token, fullName, branches) {
  const seen = new Set();
  const commits = [];
  for (const branch of branches) {
    try {
      const chunk = await loadCommitDetails(token, fullName, branch);
      for (const c of chunk || []) {
        if (!seen.has(c.sha)) {
          seen.add(c.sha);
          commits.push({ commit: c, branch });
        }
      }
    } catch {
      // rama inaccesible o sin commits; continuar con la siguiente
    }
  }
  return commits;
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
    const lifeBranch = pet?.lifeBranch || project.defaultBranch || 'main';
    const branches = [...new Set([lifeBranch, project.defaultBranch].filter(Boolean))];

    const fetched = await fetchPerBranch(req.user.githubAccessToken, project.fullName, branches);

    const result = [];
    let applied = 0;

    for (const { commit, branch } of fetched) {
      const analysis = scoreCommit(commit);
      const existing = await prisma.commitAnalysis.findUnique({
        where: { projectId_sha: { projectId: project.id, sha: commit.sha } },
      });

      const payload = {
        message: commit.commit?.message?.split('\n')[0] || '(sin mensaje)',
        author: commit.commit?.author?.name || commit.commit?.committer?.name || null,
        date: commit.commit?.author?.date ? new Date(commit.commit.author.date) : null,
        commitUrl: commit.html_url || null,
        branch,
        score: analysis.score,
        findings: analysis.findings,
      };

      if (existing) {
        await prisma.commitAnalysis.update({
          where: { id: existing.id },
          data: { ...payload, summary: existing.summary },
        });
        result.push({ sha: commit.sha, status: 'existe' });
        continue;
      }

      await prisma.commitAnalysis.create({ data: { projectId: project.id, sha: commit.sha, ...payload } });

      if (pet) {
        const isLife = branch === lifeBranch;
        const delta = applyBranchRule(deltaFromScore(analysis), isLife);
        const changes = commitChanges(pet, delta);
        await prisma.pet.update({ where: { id: pet.id }, data: changes });
        applied += 1;
      }

      result.push({ sha: commit.sha, status: 'nuevo', branch });
    }

    const petOut = pet ? withLiveStats(await prisma.pet.findUnique({ where: { id: pet.id } })) : null;

    res.json({
      analyzed: result.length,
      applied,
      lifeBranch,
      pet: petOut,
      commits: result,
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
      take: ANALYSES_LIMIT,
    });

    const summaries = new Map();
    for (const a of analyses) {
      if (!a.summary) {
        try {
          const msg = await groq.petMessage({
            commit: { message: a.message, branch: a.branch, author: a.author },
            score: a.score,
            summary: a.findings?.length ? a.findings.join(' · ') : undefined,
          });
          if (msg) {
            const updated = await prisma.commitAnalysis.update({
              where: { id: a.id },
              data: { summary: msg },
            });
            summaries.set(a.sha, msg);
            analyses[analyses.indexOf(a)] = updated;
          }
        } catch {
          // sin IA o fallo de red: se devuelve el análisis sin mensaje
        }
      }
    }

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
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron cargar los análisis', details: err.message });
  }
};

module.exports = { analyze, listAnalyses, ANALYSES_LIMIT };