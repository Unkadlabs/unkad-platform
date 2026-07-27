ALTER TABLE "users" ADD COLUMN "email_opt_out_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_nudge_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nudge_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "unsub_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_bounced_at" timestamp;