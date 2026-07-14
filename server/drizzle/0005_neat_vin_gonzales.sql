CREATE TABLE "food_log_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"food_log_id" text NOT NULL,
	"user_id" text NOT NULL,
	"revision_type" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_log" ALTER COLUMN "storage_path" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "food_log" ALTER COLUMN "mime_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "food_log" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "food_log" ADD COLUMN "entry_mode" text DEFAULT 'photo' NOT NULL;--> statement-breakpoint
ALTER TABLE "food_log_revision" ADD CONSTRAINT "food_log_revision_food_log_id_food_log_id_fk" FOREIGN KEY ("food_log_id") REFERENCES "public"."food_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_log_revision" ADD CONSTRAINT "food_log_revision_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;