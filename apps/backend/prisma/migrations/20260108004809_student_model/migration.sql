/*
  Warnings:

  - You are about to drop the column `candidate_id` on the `project_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `project_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_at` on the `project_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `project_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `project_reviews` table. All the data in the column will be lost.
  - You are about to drop the `candidates` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `student_id` to the `project_reviews` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ProjectReviewStatus" ADD VALUE 'ready';

-- DropForeignKey
ALTER TABLE "project_reviews" DROP CONSTRAINT "project_reviews_candidate_id_fkey";

-- AlterTable
ALTER TABLE "project_reviews" DROP COLUMN "candidate_id",
DROP COLUMN "expires_at",
DROP COLUMN "scheduled_at",
DROP COLUMN "timezone",
DROP COLUMN "token",
ADD COLUMN     "github_url" TEXT,
ADD COLUMN     "ppt_content" TEXT,
ADD COLUMN     "student_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "candidates";

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reg_no" TEXT NOT NULL,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- AddForeignKey
ALTER TABLE "project_reviews" ADD CONSTRAINT "project_reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
