-- Migración: stats de la mascota (sin xp/level), rama de vida, membresías compartidas, ocultar mascota y análisis de commits

-- AlterTable (Project)
ALTER TABLE "Project" ADD COLUMN "defaultBranch" TEXT;

-- AlterTable (Pet): quitar xp y level, agregar happiness, lifeBranch y updatedAt
ALTER TABLE "Pet" DROP COLUMN "xp",
DROP COLUMN "level",
ADD COLUMN "happiness" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "lifeBranch" TEXT NOT NULL DEFAULT 'main',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable (CommitAnalysis)
CREATE TABLE "CommitAnalysis" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT,
    "date" TIMESTAMP(3),
    "commitUrl" TEXT,
    "branch" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommitAnalysis_projectId_sha_key" ON "CommitAnalysis"("projectId", "sha");

-- CreateTable (ProjectMember)
CREATE TABLE "ProjectMember" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateTable (PetHidden)
CREATE TABLE "PetHidden" (
    "id" SERIAL NOT NULL,
    "petId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetHidden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PetHidden_petId_userId_key" ON "PetHidden"("petId", "userId");

-- AddForeignKey (CommitAnalysis)
ALTER TABLE "CommitAnalysis" ADD CONSTRAINT "CommitAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (ProjectMember)
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (PetHidden)
ALTER TABLE "PetHidden" ADD CONSTRAINT "PetHidden_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PetHidden" ADD CONSTRAINT "PetHidden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;