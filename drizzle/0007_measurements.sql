ALTER TABLE "body_weights" ALTER COLUMN "weight_kg" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "bmi" double precision;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "fat_pct" double precision;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "visceral_fat" double precision;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "muscle_kg" double precision;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "bone_kg" double precision;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "water_pct" double precision;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "bmr" integer;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "metabolic_age" integer;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "waist_cm" double precision;--> statement-breakpoint
ALTER TABLE "body_weights" ADD COLUMN "hip_cm" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sex" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "height_cm" double precision;