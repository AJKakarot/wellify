CREATE TABLE "voice_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"audio_url" text,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"original_filename" text,
	"duration_seconds" integer,
	"transcript" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"created_log_entry_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voice_log" ADD CONSTRAINT "voice_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_log" ADD CONSTRAINT "voice_log_created_log_entry_id_log_entry_id_fk" FOREIGN KEY ("created_log_entry_id") REFERENCES "public"."log_entry"("id") ON DELETE no action ON UPDATE no action;