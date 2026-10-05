CREATE TABLE "hubi_ai_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session" uuid NOT NULL,
	"kind" text NOT NULL,
	"item_id" text,
	"said" text,
	"correct" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hubi_ai_events_created_idx" ON "hubi_ai_events" USING btree ("created_at");