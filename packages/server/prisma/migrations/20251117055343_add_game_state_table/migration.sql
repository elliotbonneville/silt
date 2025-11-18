-- CreateTable
CREATE TABLE "game_state" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
