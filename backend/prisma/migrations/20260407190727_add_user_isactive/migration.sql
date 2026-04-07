-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Viajante',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "xpPhysical" REAL NOT NULL DEFAULT 0,
    "xpDiscipline" REAL NOT NULL DEFAULT 0,
    "xpMental" REAL NOT NULL DEFAULT 0,
    "xpIntellect" REAL NOT NULL DEFAULT 0,
    "xpProductivity" REAL NOT NULL DEFAULT 0,
    "xpFinancial" REAL NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentXp" REAL NOT NULL DEFAULT 0,
    "rank" TEXT NOT NULL DEFAULT 'Estudante da Academia'
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "currentXp", "email", "id", "level", "name", "password", "rank", "role", "updatedAt", "xpDiscipline", "xpFinancial", "xpIntellect", "xpMental", "xpPhysical", "xpProductivity") SELECT "avatarUrl", "createdAt", "currentXp", "email", "id", "level", "name", "password", "rank", "role", "updatedAt", "xpDiscipline", "xpFinancial", "xpIntellect", "xpMental", "xpPhysical", "xpProductivity" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
