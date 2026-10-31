CREATE TABLE "org_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"sentence_id" text NOT NULL,
	"submission_id" uuid NOT NULL,
	"sector" "sector" NOT NULL,
	"reviewer_name" text NOT NULL,
	"verdict" text NOT NULL,
	"original_text" text NOT NULL,
	"edited_text" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"token" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_reviews" ADD CONSTRAINT "org_reviews_org_id_review_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."review_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_reviews" ADD CONSTRAINT "org_reviews_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_reviews_org_sentence_idx" ON "org_reviews" USING btree ("org_id","sentence_id");--> statement-breakpoint
CREATE INDEX "org_reviews_org_sector_idx" ON "org_reviews" USING btree ("org_id","sector");--> statement-breakpoint
CREATE UNIQUE INDEX "review_orgs_token_idx" ON "review_orgs" USING btree ("token");