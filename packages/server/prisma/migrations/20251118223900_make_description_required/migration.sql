-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "accountId" TEXT,
    "currentRoomId" TEXT NOT NULL,
    "spawnPointId" TEXT,
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
INSERT INTO "new_characters" ("accountId", "attackPower", "createdAt", "currentRoomId", "defense", "description", "diedAt", "hp", "id", "isAlive", "isDead", "lastActionAt", "maxHp", "name", "spawnPointId", "updatedAt") SELECT "accountId", "attackPower", "createdAt", "currentRoomId", "defense", coalesce("description", '') AS "description", "diedAt", "hp", "id", "isAlive", "isDead", "lastActionAt", "maxHp", "name", "spawnPointId", "updatedAt" FROM "characters";
DROP TABLE "characters";
ALTER TABLE "new_characters" RENAME TO "characters";
CREATE INDEX "characters_accountId_idx" ON "characters"("accountId");
CREATE INDEX "characters_isAlive_idx" ON "characters"("isAlive");
CREATE INDEX "characters_currentRoomId_idx" ON "characters"("currentRoomId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
