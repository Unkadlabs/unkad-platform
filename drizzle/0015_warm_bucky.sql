CREATE TABLE "hubi_ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"lang" text DEFAULT 'so' NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"profile" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hubi_ai_runs" ADD CONSTRAINT "hubi_ai_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hubi_ai_runs_created_idx" ON "hubi_ai_runs" USING btree ("created_at");