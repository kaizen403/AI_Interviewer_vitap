-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "ppt_embeddings" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "slide_num" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppt_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ppt_embeddings_review_id_idx" ON "ppt_embeddings"("review_id");

-- AddForeignKey
ALTER TABLE "ppt_embeddings" ADD CONSTRAINT "ppt_embeddings_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "project_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
