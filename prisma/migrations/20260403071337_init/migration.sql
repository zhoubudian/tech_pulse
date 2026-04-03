-- CreateEnum
CREATE TYPE "SourcePlatform" AS ENUM ('GITHUB', 'HACKER_NEWS', 'JUEJIN');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT[],
    "score" INTEGER NOT NULL DEFAULT 0,
    "platform" "SourcePlatform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_originalUrl_key" ON "Article"("originalUrl");

-- CreateIndex
CREATE INDEX "Article_platform_createdAt_idx" ON "Article"("platform", "createdAt");
