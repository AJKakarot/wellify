CREATE TABLE "daily_nutrition_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"total_calories" integer DEFAULT 0 NOT NULL,
	"total_protein" real DEFAULT 0 NOT NULL,
	"total_carbs" real DEFAULT 0 NOT NULL,
	"total_fat" real DEFAULT 0 NOT NULL,
	"breakfast_calories" integer DEFAULT 0 NOT NULL,
	"lunch_calories" integer DEFAULT 0 NOT NULL,
	"dinner_calories" integer DEFAULT 0 NOT NULL,
	"snack_calories" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_goal" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"daily_calories" integer,
	"daily_protein" real,
	"daily_carbs" real,
	"daily_fat" real,
	"goal_type" text,
	"activity_level" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nutrition_goal_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "daily_nutrition_summary" ADD CONSTRAINT "daily_nutrition_summary_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_goal" ADD CONSTRAINT "nutrition_goal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;