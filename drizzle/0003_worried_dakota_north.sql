ALTER TYPE "public"."mode" ADD VALUE 'proverb';--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "prompt_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "meaning_en" text;