-- AlterTable
ALTER TABLE "User" ADD COLUMN "pushToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_pushToken_key" ON "User"("pushToken");
