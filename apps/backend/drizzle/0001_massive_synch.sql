CREATE TYPE "public"."ai_content_result" AS ENUM('likely_ai', 'possibly_ai', 'likely_human', 'uncertain');--> statement-breakpoint
CREATE TYPE "public"."project_review_status" AS ENUM('pending', 'upload_required', 'processing', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "project_review_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"ai_detection_result" "ai_content_result",
	"ai_detection_confidence" real,
	"ai_detection_summary" text,
	"total_questions" integer DEFAULT 0,
	"easy_questions" integer DEFAULT 0,
	"medium_questions" integer DEFAULT 0,
	"hard_questions" integer DEFAULT 0,
	"overall_score" real,
	"understanding_score" real,
	"clarity_score" real,
	"depth_score" real,
	"strengths" jsonb DEFAULT '[]'::jsonb,
	"improvements" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_review_reports_review_id_unique" UNIQUE("review_id")
);
--> statement-breakpoint
CREATE TABLE "project_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar(128) NOT NULL,
	"token" varchar(512) NOT NULL,
	"candidate_id" uuid,
	"project_title" varchar(256) NOT NULL,
	"project_description" text,
	"ppt_file_name" varchar(256),
	"ppt_file_url" text,
	"ppt_file_size" integer,
	"ppt_uploaded_at" timestamp,
	"scheduled_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration" integer DEFAULT 30,
	"timezone" varchar(64) DEFAULT 'UTC',
	"status" "project_review_status" DEFAULT 'pending',
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_reviews_room_id_unique" UNIQUE("room_id")
);
--> statement-breakpoint
ALTER TABLE "project_review_reports" ADD CONSTRAINT "project_review_reports_review_id_project_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."project_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reviews" ADD CONSTRAINT "project_reviews_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;