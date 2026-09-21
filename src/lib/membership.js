const prisma = require('./prisma');

async function isProjectMember(projectId, userId) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return Boolean(member);
}

async function ensureMember(projectId, userId, role = 'member') {
  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { role },
    create: { projectId, userId, role },
  });
}

async function memberOf(projectId, userId) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

async function isPetHiddenBy(petId, userId) {
  const hidden = await prisma.petHidden.findUnique({
    where: { petId_userId: { petId, userId } },
  });
  return Boolean(hidden);
}

module.exports = { isProjectMember, ensureMember, memberOf, isPetHiddenBy };