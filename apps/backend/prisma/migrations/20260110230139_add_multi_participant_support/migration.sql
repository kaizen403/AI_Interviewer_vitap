/*
  Warnings:

  - A unique constraint covering the columns `[join_code]` on the table `project_reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "project_reviews" ADD COLUMN     "join_code" TEXT,
ADD COLUMN     "max_participants" INTEGER NOT NULL DEFAULT 6;

-- CreateTable
CREATE TABLE "review_participants" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "is_host" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "review_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_participants_review_id_identity_key" ON "review_participants"("review_id", "identity");

-- CreateIndex
CREATE UNIQUE INDEX "project_reviews_join_code_key" ON "project_reviews"("join_code");

-- AddForeignKey
ALTER TABLE "review_participants" ADD CONSTRAINT "review_participants_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "project_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
