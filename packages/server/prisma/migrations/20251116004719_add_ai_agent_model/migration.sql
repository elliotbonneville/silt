-- CreateTable
CREATE TABLE "ai_agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "homeRoomId" TEXT NOT NULL,
    "maxRoomsFromHome" INTEGER NOT NULL DEFAULT 2,
    "relationshipsJson" TEXT NOT NULL DEFAULT '{}',
    "conversationJson" TEXT NOT NULL DEFAULT '[]',
    "lastActionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_agents_characterId_key" ON "ai_agents"("characterId");

-- CreateIndex
CREATE INDEX "ai_agents_characterId_idx" ON "ai_agents"("characterId");
