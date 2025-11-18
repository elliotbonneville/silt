-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ai_agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "homeRoomId" TEXT NOT NULL,
    "maxRoomsFromHome" INTEGER NOT NULL DEFAULT 2,
    "relationshipsJson" TEXT NOT NULL DEFAULT '{}',
    "conversationJson" TEXT NOT NULL DEFAULT '[]',
    "spatialMemory" TEXT NOT NULL DEFAULT '',
    "spatialMemoryUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ai_agents" ("characterId", "conversationJson", "createdAt", "homeRoomId", "id", "lastActionAt", "maxRoomsFromHome", "relationshipsJson", "systemPrompt", "updatedAt") SELECT "characterId", "conversationJson", "createdAt", "homeRoomId", "id", "lastActionAt", "maxRoomsFromHome", "relationshipsJson", "systemPrompt", "updatedAt" FROM "ai_agents";
DROP TABLE "ai_agents";
ALTER TABLE "new_ai_agents" RENAME TO "ai_agents";
CREATE UNIQUE INDEX "ai_agents_characterId_key" ON "ai_agents"("characterId");
CREATE INDEX "ai_agents_characterId_idx" ON "ai_agents"("characterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
