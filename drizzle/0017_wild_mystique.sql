CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_slug" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"question" text,
	"lang" text DEFAULT 'so' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"reminded_day_at" timestamp,
	"reminded_hour_at" timestamp,
	"unsubscribed_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "event_registrations_event_email_idx" ON "event_registrations" USING btree ("event_slug","email");