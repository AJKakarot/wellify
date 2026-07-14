CREATE TABLE "food_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"image_url" text,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"original_filename" text,
	"detected_foods" jsonb,
	"total_calories" integer,
	"total_protein" real,
	"total_carbs" real,
	"total_fat" real,
	"user_corrected" boolean DEFAULT false,
	"corrected_data" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"meal_type" text,
	"notes" text,
	"logged_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;