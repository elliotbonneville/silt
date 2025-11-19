-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_game_state" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "gameTime" BIGINT NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_game_state" ("createdAt", "id", "isPaused", "updatedAt") SELECT "createdAt", "id", "isPaused", "updatedAt" FROM "game_state";
DROP TABLE "game_state";
ALTER TABLE "new_game_state" RENAME TO "game_state";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
