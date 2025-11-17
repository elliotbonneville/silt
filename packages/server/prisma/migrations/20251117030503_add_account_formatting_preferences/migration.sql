-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "themePreset" TEXT NOT NULL DEFAULT 'classic',
    "fontFamily" TEXT NOT NULL DEFAULT 'monospace',
    "fontSize" INTEGER NOT NULL DEFAULT 14,
    "customColorsJson" TEXT NOT NULL DEFAULT '{}'
);
INSERT INTO "new_accounts" ("createdAt", "id", "updatedAt", "username") SELECT "createdAt", "id", "updatedAt", "username" FROM "accounts";
DROP TABLE "accounts";
ALTER TABLE "new_accounts" RENAME TO "accounts";
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
