ALTER TABLE "exercises" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD COLUMN "pain_limit" text;--> statement-breakpoint
-- Pijngrenzen die eerder in de RPE-kolom zijn gezet (bijv. "pijn max 3/10") naar de nieuwe kolom verplaatsen.
UPDATE "program_exercises" SET "pain_limit" = "rpe", "rpe" = NULL WHERE "rpe" ILIKE '%pijn%';
