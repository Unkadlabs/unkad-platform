ALTER TABLE "seed_items" ADD COLUMN "input" text;--> statement-breakpoint
ALTER TABLE "seed_items" ADD COLUMN "instruction_en" text;--> statement-breakpoint
ALTER TABLE "seed_items" ADD COLUMN "input_en" text;--> statement-breakpoint
ALTER TABLE "seed_items" ADD COLUMN "response_en" text;--> statement-breakpoint
ALTER TABLE "seed_items" ADD COLUMN "status" text DEFAULT 'needs_review' NOT NULL;--> statement-breakpoint
ALTER TABLE "seed_items" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "seed_items" ADD COLUMN "verified_at" timestamp;