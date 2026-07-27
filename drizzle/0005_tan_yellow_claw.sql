CREATE TABLE "submission_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"text_so" text NOT NULL,
	"text_en" text,
	"meaning_en" text,
	"edited_by" uuid NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_revisions" ADD CONSTRAINT "submission_revisions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_revisions" ADD CONSTRAINT "submission_revisions_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "submission_revisions_submission_idx" ON "submission_revisions" USING btree ("submission_id");