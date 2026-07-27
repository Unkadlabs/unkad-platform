CREATE TABLE "password_reset_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fulfilled_at" timestamp,
	"fulfilled_by" uuid,
	"auto_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_fulfilled_by_users_id_fk" FOREIGN KEY ("fulfilled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_requests_pending_idx" ON "password_reset_requests" USING btree ("fulfilled_at","created_at");