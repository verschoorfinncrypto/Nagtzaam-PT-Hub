ALTER TABLE "exercises" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "equipment" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "level" integer;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "muscles" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "cues" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "built_in" boolean DEFAULT false NOT NULL;