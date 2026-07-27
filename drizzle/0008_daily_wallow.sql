ALTER TABLE "users" ADD COLUMN "provenance_cleared_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provenance_cleared_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provenance_note" text;