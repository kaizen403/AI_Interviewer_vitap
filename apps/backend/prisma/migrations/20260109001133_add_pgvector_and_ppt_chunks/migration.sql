/*
  Warnings:

  - You are about to drop the `ppt_embeddings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ppt_embeddings" DROP CONSTRAINT "ppt_embeddings_review_id_fkey";

-- DropTable
DROP TABLE "ppt_embeddings";

-- CreateTable
CREATE TABLE "ppt_chunks" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "slide_number" INTEGER,
    "slide_title" TEXT,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppt_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ppt_chunks_review_id_idx" ON "ppt_chunks"("review_id");

-- AddForeignKey
ALTER TABLE "ppt_chunks" ADD CONSTRAINT "ppt_chunks_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "project_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
