-- CreateEnum
CREATE TYPE "ProjectReviewStatus" AS ENUM ('pending', 'upload_required', 'processing', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AIContentResult" AS ENUM ('likely_ai', 'possibly_ai', 'likely_human', 'uncertain');

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_reviews" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "candidate_id" TEXT,
    "project_title" TEXT NOT NULL,
    "project_description" TEXT,
    "ppt_file_name" TEXT,
    "ppt_file_url" TEXT,
    "ppt_file_size" INTEGER,
    "ppt_uploaded_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER DEFAULT 30,
    "timezone" TEXT DEFAULT 'UTC',
    "status" "ProjectReviewStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_review_reports" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "ai_detection_result" "AIContentResult",
    "ai_detection_confidence" DOUBLE PRECISION,
    "ai_detection_summary" TEXT,
    "total_questions" INTEGER DEFAULT 0,
    "easy_questions" INTEGER DEFAULT 0,
    "medium_questions" INTEGER DEFAULT 0,
    "hard_questions" INTEGER DEFAULT 0,
    "overall_score" DOUBLE PRECISION,
    "understanding_score" DOUBLE PRECISION,
    "clarity_score" DOUBLE PRECISION,
    "depth_score" DOUBLE PRECISION,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "improvements" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_reviews_room_id_key" ON "project_reviews"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_review_reports_review_id_key" ON "project_review_reports"("review_id");

-- AddForeignKey
ALTER TABLE "project_reviews" ADD CONSTRAINT "project_reviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_review_reports" ADD CONSTRAINT "project_review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "project_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
