-- CreateEnum
CREATE TYPE "Slot" AS ENUM ('HEAD', 'BODY', 'LEGS');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "assetId" INTEGER,
ADD COLUMN     "slot" "Slot";

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "modelAssetId" INTEGER;

-- AlterTable
ALTER TABLE "PetItem" ADD COLUMN     "equipped" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'glb',
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_modelAssetId_fkey" FOREIGN KEY ("modelAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
