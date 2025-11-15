-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "accountId" TEXT,
    "currentRoomId" TEXT NOT NULL,
    "spawnRoomId" TEXT NOT NULL,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "maxHp" INTEGER NOT NULL DEFAULT 100,
    "attackPower" INTEGER NOT NULL DEFAULT 10,
    "defense" INTEGER NOT NULL DEFAULT 5,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "isDead" BOOLEAN NOT NULL DEFAULT false,
    "lastActionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "diedAt" DATETIME,
    CONSTRAINT "characters_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exitsJson" TEXT NOT NULL DEFAULT '{}',
    "isStarting" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "statsJson" TEXT NOT NULL DEFAULT '{}',
    "roomId" TEXT,
    "characterId" TEXT,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "items_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "items_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originRoomId" TEXT NOT NULL,
    "content" TEXT,
    "dataJson" TEXT,
    "visibility" TEXT NOT NULL,
    "attenuated" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

-- CreateIndex
CREATE INDEX "characters_accountId_idx" ON "characters"("accountId");

-- CreateIndex
CREATE INDEX "characters_isAlive_idx" ON "characters"("isAlive");

-- CreateIndex
CREATE INDEX "characters_currentRoomId_idx" ON "characters"("currentRoomId");

-- CreateIndex
CREATE INDEX "rooms_isStarting_idx" ON "rooms"("isStarting");

-- CreateIndex
CREATE INDEX "items_roomId_idx" ON "items"("roomId");

-- CreateIndex
CREATE INDEX "items_characterId_idx" ON "items"("characterId");

-- CreateIndex
CREATE INDEX "game_events_timestamp_idx" ON "game_events"("timestamp");

-- CreateIndex
CREATE INDEX "game_events_type_idx" ON "game_events"("type");

-- CreateIndex
CREATE INDEX "game_events_originRoomId_idx" ON "game_events"("originRoomId");
