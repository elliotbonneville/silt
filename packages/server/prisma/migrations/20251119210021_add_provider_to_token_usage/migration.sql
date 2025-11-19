-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_token_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "cost" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "agentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_token_usage" ("agentId", "completionTokens", "cost", "createdAt", "id", "model", "promptTokens", "source", "totalTokens") SELECT "agentId", "completionTokens", "cost", "createdAt", "id", "model", "promptTokens", "source", "totalTokens" FROM "token_usage";
DROP TABLE "token_usage";
ALTER TABLE "new_token_usage" RENAME TO "token_usage";
CREATE INDEX "token_usage_createdAt_idx" ON "token_usage"("createdAt");
CREATE INDEX "token_usage_agentId_idx" ON "token_usage"("agentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
