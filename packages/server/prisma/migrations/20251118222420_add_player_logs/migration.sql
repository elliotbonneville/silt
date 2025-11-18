-- CreateTable
CREATE TABLE "player_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "player_logs_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "player_logs_characterId_idx" ON "player_logs"("characterId");

-- CreateIndex
CREATE INDEX "player_logs_createdAt_idx" ON "player_logs"("createdAt");
