-- CreateTable
CREATE TABLE "token_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "cost" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "agentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "token_usage_createdAt_idx" ON "token_usage"("createdAt");

-- CreateIndex
CREATE INDEX "token_usage_agentId_idx" ON "token_usage"("agentId");
