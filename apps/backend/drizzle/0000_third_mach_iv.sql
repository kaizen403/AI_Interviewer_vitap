CREATE TYPE "public"."interview_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."recommendation" AS ENUM('strong_hire', 'consider', 'borderline', 'no_hire');--> statement-breakpoint
CREATE TYPE "public"."seniority_level" AS ENUM('junior', 'mid', 'senior', 'lead', 'principal');--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"phone" varchar(32),
	"resume_text" text,
	"resume_skills" jsonb DEFAULT '[]'::jsonb,
	"accommodations" jsonb DEFAULT '[]'::jsonb,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"profile" text,
	"values" jsonb DEFAULT '[]'::jsonb,
	"ethics_guidelines" text,
	"industry" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"probe_score_total" real,
	"probe_score_dm" real,
	"probe_score_ps" real,
	"probe_score_cm" real,
	"probe_score_ad" real,
	"probe_score_ef" real,
	"probe_score_va" real,
	"confidence" real,
	"trajectory" varchar(32),
	"questions_asked" integer DEFAULT 0,
	"questions_answered" integer DEFAULT 0,
	"questions_skipped" integer DEFAULT 0,
	"avg_response_time" real,
	"max_difficulty_reached" integer,
	"recommendation" "recommendation",
	"recommendation_notes" text,
	"strengths" jsonb DEFAULT '[]'::jsonb,
	"improvements" jsonb DEFAULT '[]'::jsonb,
	"red_flags" jsonb DEFAULT '[]'::jsonb,
	"review_flags" jsonb DEFAULT '[]'::jsonb,
	"integrity_score" real,
	"warnings_issued" integer DEFAULT 0,
	"alerts_filtered" integer DEFAULT 0,
	"emergency_pause_used" boolean DEFAULT false,
	"connection_quality" varchar(32),
	"disconnects" integer DEFAULT 0,
	"total_pause_time" integer DEFAULT 0,
	"exit_reason" varchar(64),
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_reports_interview_id_unique" UNIQUE("interview_id")
);
--> statement-breakpoint
CREATE TABLE "interview_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"role" varchar(32) NOT NULL,
	"content" text NOT NULL,
	"phase" varchar(64),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar(128) NOT NULL,
	"token" varchar(512) NOT NULL,
	"candidate_id" uuid,
	"job_id" uuid,
	"company_id" uuid,
	"interviewer_id" varchar(128),
	"interviewer_name" varchar(256),
	"scheduled_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration" integer DEFAULT 40,
	"timezone" varchar(64) DEFAULT 'UTC',
	"status" "interview_status" DEFAULT 'scheduled',
	"proctoring_enabled" boolean DEFAULT true,
	"language" varchar(10) DEFAULT 'en',
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interviews_room_id_unique" UNIQUE("room_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"title" varchar(256) NOT NULL,
	"description" text,
	"required_skills" jsonb DEFAULT '[]'::jsonb,
	"topics" jsonb DEFAULT '[]'::jsonb,
	"seniority_level" "seniority_level" DEFAULT 'mid',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proctoring_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"detection" varchar(64) NOT NULL,
	"confidence" real NOT NULL,
	"severity" varchar(32) NOT NULL,
	"warning_issued" boolean DEFAULT false,
	"message" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_reports" ADD CONSTRAINT "interview_reports_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_transcripts" ADD CONSTRAINT "interview_transcripts_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proctoring_alerts" ADD CONSTRAINT "proctoring_alerts_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE no action ON UPDATE no action;