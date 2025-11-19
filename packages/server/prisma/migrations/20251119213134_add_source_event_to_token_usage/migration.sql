-- AlterTable
ALTER TABLE "token_usage" ADD COLUMN "sourceEventId" TEXT;

-- CreateIndex
CREATE INDEX "token_usage_sourceEventId_idx" ON "token_usage"("sourceEventId");
