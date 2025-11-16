/*
  Warnings:

  - You are about to drop the column `spawnRoomId` on the `characters` table. All the data in the column will be lost.
  - Added the required column `spawnPointId` to the `characters` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "accountId" TEXT,
    "currentRoomId" TEXT NOT NULL,
    "spawnPointId" TEXT NOT NULL,
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
INSERT INTO "new_characters" ("accountId", "attackPower", "createdAt", "currentRoomId", "defense", "diedAt", "hp", "id", "isAlive", "isDead", "lastActionAt", "maxHp", "name", "updatedAt") SELECT "accountId", "attackPower", "createdAt", "currentRoomId", "defense", "diedAt", "hp", "id", "isAlive", "isDead", "lastActionAt", "maxHp", "name", "updatedAt" FROM "characters";
DROP TABLE "characters";
ALTER TABLE "new_characters" RENAME TO "characters";
CREATE INDEX "characters_accountId_idx" ON "characters"("accountId");
CREATE INDEX "characters_isAlive_idx" ON "characters"("isAlive");
CREATE INDEX "characters_currentRoomId_idx" ON "characters"("currentRoomId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
