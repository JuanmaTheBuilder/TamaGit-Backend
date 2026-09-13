const prisma = require('../lib/prisma');
const { listUserRepos, getRepoTree } = require('../lib/githubApi');
const { detectTools, speciesFromLanguage, readPackageDeps } = require('../lib/tools');

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
            mainLanguage: repo.language,
            tools,
            ownerId: req.user.id,
            lastSyncedAt: new Date(),
          },
          create: {
            githubRepoId: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            mainLanguage: repo.language,
            tools,
            ownerId: req.user.id,
            lastSyncedAt: new Date(),
          },
        });

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
  const projects = await prisma.project.findMany({
    where: { ownerId: req.user.id },
    include: { pet: true },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(
    projects.map((p) => ({
      id: p.id,
      githubRepoId: p.githubRepoId,
      name: p.name,
      fullName: p.fullName,
      mainLanguage: p.mainLanguage,
      tools: p.tools,
      lastSyncedAt: p.lastSyncedAt,
      pet: p.pet,
    }))
  );
};

const createPet = async (req, res) => {
  const projectId = Number(req.params.projectId);

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: req.user.id },
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const existing = await prisma.pet.findUnique({ where: { projectId } });
    if (existing) {
      return res.status(409).json({ error: 'Este proyecto ya tiene una mascota' });
    }

    const requestedName = (req.body.name || '').trim();
    const name = requestedName || project.name;
    const species = speciesFromLanguage(project.mainLanguage);

    const pet = await prisma.pet.create({
      data: { name, species, projectId },
    });

    res.status(201).json(pet);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo crear la mascota', details: err.message });
  }
};

const getPetByProject = async (req, res) => {
  const projectId = Number(req.params.projectId);

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: req.user.id },
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const pet = await prisma.pet.findUnique({ where: { projectId } });
    if (!pet) {
      return res.status(404).json({ error: 'Este proyecto aún no tiene mascota' });
    }

    res.json(pet);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener la mascota', details: err.message });
  }
};

module.exports = { sync, listProjects, createPet, getPetByProject };