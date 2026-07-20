CREATE TYPE "public"."sector" AS ENUM('health', 'education', 'agriculture', 'law', 'media', 'religion', 'culture', 'technology', 'general');--> statement-breakpoint
ALTER TABLE "prompts" ADD COLUMN "sector" "sector" DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "sector" "sector";--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;