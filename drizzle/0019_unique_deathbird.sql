CREATE TABLE "blind_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" text NOT NULL,
	"best" text NOT NULL,
	"worst" text NOT NULL,
	"voter_key" text NOT NULL,
	"user_id" uuid,
	"is_contributor" boolean DEFAULT false NOT NULL,
	"native" text,
	"ms_on_set" integer,
	"lang" text DEFAULT 'so' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blind_votes" ADD CONSTRAINT "blind_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blind_votes_voter_set" ON "blind_votes" USING btree ("voter_key","set_id");--> statement-breakpoint
CREATE INDEX "blind_votes_set_idx" ON "blind_votes" USING btree ("set_id");