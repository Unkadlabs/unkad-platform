CREATE TABLE "seed_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"sectors" text NOT NULL,
	"per_sector" integer DEFAULT 43 NOT NULL,
	"consent_at" timestamp,
	"credit_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp,
	CONSTRAINT "seed_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "seed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_id" uuid NOT NULL,
	"ref" text NOT NULL,
	"type" text DEFAULT 'task' NOT NULL,
	"sector" text NOT NULL,
	"instruction" text NOT NULL,
	"response" text NOT NULL,
	"note" text,
	"license" text DEFAULT 'CC-BY-SA-4.0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seed_items" ADD CONSTRAINT "seed_items_invite_id_seed_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."seed_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seed_invites_token_idx" ON "seed_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "seed_items_invite_idx" ON "seed_items" USING btree ("invite_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seed_items_ref_idx" ON "seed_items" USING btree ("invite_id","ref");