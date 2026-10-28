const prisma = require('../lib/prisma');
const { listUserRepos, getRepoTree } = require('../lib/githubApi');
const { detectTools, speciesFromLanguage, readPackageDeps } = require('../lib/tools');
const { ensureMember, memberOf } = require('../lib/membership');

const sync = async (req, res) => {
  const token = req.user.githubAccessToken;

  if (!token) {
    return res.status(401).json({ error: 'El usuario no tiene token de GitHub vigente. Vuelve a iniciar sesión.' });
  }

  try {
    const repos = await listUserRepos(token);
    const results = [];

    for (const repo of repos) {
      try {
        const filePaths = await getRepoTree(token, repo.full_name, repo.default_branch);
        const deps = await readPackageDeps(token, repo.full_name, repo.default_branch);
        const tools = detectTools({ filePaths, deps });

        const project = await prisma.project.upsert({
          where: { githubRepoId: repo.id },
          update: {
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch,
            mainLanguage: repo.language,
            tools,
            lastSyncedAt: new Date(),
          },
          create: {
            githubRepoId: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch,
            mainLanguage: repo.language,
            tools,
            ownerId: req.user.id,
            lastSyncedAt: new Date(),
          },
        });

        await ensureMember(project.id, req.user.id, 'member');
        results.push({ repo: repo.full_name, status: 'ok', tools, language: repo.language });
      } catch (err) {
        results.push({ repo: repo.full_name, status: 'error', error: err.message });
      }
    }

    res.json({ synced: results.length, detail: results });
  } catch (err) {
    res.status(err.status || 500).json({ error: 'No se pudo sincronizar', details: err.message });
  }
};

const listProjects = async (req, res) => {
  const membershipRows = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    select: { projectId: true },
  });
  const projectIds = membershipRows.map((m) => m.projectId);

  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    include: { pet: true },
    orderBy: { updatedAt: 'desc' },
  });

  const hidden = await prisma.petHidden.findMany({
    where: { userId: req.user.id },
    select: { petId: true },
  });
  const hiddenIds = new Set(hidden.map((h) => h.petId));

  res.json(
    projects.map((p) => ({
      id: p.id,
      githubRepoId: p.githubRepoId,
      name: p.name,
      fullName: p.fullName,
      defaultBranch: p.defaultBranch,
      mainLanguage: p.mainLanguage,
      tools: p.tools,
      lastSyncedAt: p.lastSyncedAt,
      pet: p.pet && !hiddenIds.has(p.pet.id) ? p.pet : null,
    }))
  );
};

const createPet = async (req, res) => {
  const projectId = Number(req.params.projectId);

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const member = await memberOf(project.id, req.user.id);
    if (!member && project.ownerId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Debes ser miembro del repositorio para crear la mascota' });
    }

    const existing = await prisma.pet.findUnique({ where: { projectId } });
    if (existing) {
      return res.status(409).json({ error: 'Este proyecto ya tiene una mascota' });
    }

    const requestedName = (req.body.name || '').trim();
    const name = requestedName || project.name;
    const species = speciesFromLanguage(project.mainLanguage);
    const lifeBranch = (req.body.lifeBranch || '').trim() || project.defaultBranch || 'main';

    const pet = await prisma.pet.create({
      data: { name, species, projectId, lifeBranch },
    });

    res.status(201).json({
      pet,
      project: {
        id: project.id,
        name: project.name,
        fullName: project.fullName,
        defaultBranch: project.defaultBranch,
        ownerId: project.ownerId,
      },
      hiddenByUser: false,
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo crear la mascota', details: err.message });
  }
};

const getPetByProject = async (req, res) => {
  const projectId = Number(req.params.projectId);

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const member = await memberOf(project.id, req.user.id);
    if (!member && project.ownerId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'No tienes permiso para ver este proyecto' });
    }

    const pet = await prisma.pet.findUnique({ where: { projectId } });

    const hidden = pet ? await require('../lib/membership').isPetHiddenBy(pet.id, req.user.id) : false;

    if (!pet || (hidden && project.ownerId !== req.user.id && !req.user.isAdmin)) {
      return res.json({
        pet: null,
        project: {
          id: project.id,
          name: project.name,
          fullName: project.fullName,
          defaultBranch: project.defaultBranch,
          ownerId: project.ownerId,
        },
        hiddenByUser: hidden,
      });
    }

    res.json({
      pet,
      project: {
        id: project.id,
        name: project.name,
        fullName: project.fullName,
        defaultBranch: project.defaultBranch,
        ownerId: project.ownerId,
      },
      hiddenByUser: false,
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener la mascota', details: err.message });
  }
};

module.exports = { sync, listProjects, createPet, getPetByProject };