-- AlterTable (Food): talla de la comida (small/medium/large)
ALTER TABLE "Food" ADD COLUMN "size" TEXT NOT NULL DEFAULT 'medium';

-- AlterTable (CommitAnalysis): cuando se comió el platillo
ALTER TABLE "CommitAnalysis" ADD COLUMN "fedAt" TIMESTAMP(3);