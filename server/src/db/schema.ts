import { pgTable, text, timestamp, boolean, jsonb, integer, real } from "drizzle-orm/pg-core";
import type { DetectedFood, FoodLogRevisionPayload } from "../types/index.js";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const logEntry = pgTable("log_entry", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  content: text("content").notNull(),
  type: text("type").notNull().default("health_log"),
  status: text("status").notNull().default("pending"), 
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const foodLog = pgTable("food_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  title: text("title"),
  entryMode: text("entry_mode").notNull().default("photo"),
  imageUrl: text("image_url"),
  storagePath: text("storage_path"),
  mimeType: text("mime_type"),
  originalFilename: text("original_filename"),
  detectedFoods: jsonb("detected_foods").$type<DetectedFood[]>(),
  totalCalories: integer("total_calories"),
  totalProtein: real("total_protein"),
  totalCarbs: real("total_carbs"),
  totalFat: real("total_fat"),
  userCorrected: boolean("user_corrected").default(false),
  correctedData: jsonb("corrected_data"),
  status: text("status").notNull().default("pending"),
  processingError: text("processing_error"),
  mealType: text("meal_type"),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const foodLogRevision = pgTable("food_log_revision", {
  id: text("id").primaryKey(),
  foodLogId: text("food_log_id").notNull().references(() => foodLog.id),
  userId: text("user_id").notNull().references(() => user.id),
  revisionType: text("revision_type").notNull(),
  data: jsonb("data").$type<FoodLogRevisionPayload>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const voiceLog = pgTable("voice_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  audioUrl: text("audio_url"),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  originalFilename: text("original_filename"),
  durationSeconds: integer("duration_seconds"),
  transcript: text("transcript"),
  status: text("status").notNull().default("pending"),
  processingError: text("processing_error"),
  createdLogEntryId: text("created_log_entry_id").references(() => logEntry.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const nutritionGoal = pgTable("nutrition_goal", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id).unique(),
  dailyCalories: integer("daily_calories"),
  dailyProtein: real("daily_protein"),
  dailyCarbs: real("daily_carbs"),
  dailyFat: real("daily_fat"),
  goalType: text("goal_type"),
  activityLevel: text("activity_level"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dailyNutritionSummary = pgTable("daily_nutrition_summary", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  date: text("date").notNull(),
  totalCalories: integer("total_calories").notNull().default(0),
  totalProtein: real("total_protein").notNull().default(0),
  totalCarbs: real("total_carbs").notNull().default(0),
  totalFat: real("total_fat").notNull().default(0),
  breakfastCalories: integer("breakfast_calories").notNull().default(0),
  lunchCalories: integer("lunch_calories").notNull().default(0),
  dinnerCalories: integer("dinner_calories").notNull().default(0),
  snackCalories: integer("snack_calories").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const waterLog = pgTable("water_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  amountMl: integer("amount_ml").notNull(),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const exerciseLog = pgTable("exercise_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  activityType: text("activity_type").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  estimatedCaloriesBurned: integer("estimated_calories_burned"),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const weightLog = pgTable("weight_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  weightKg: real("weight_kg").notNull(),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dailyHealthSummary = pgTable("daily_health_summary", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  date: text("date").notNull(),
  waterMl: integer("water_ml").notNull().default(0),
  exerciseMinutes: integer("exercise_minutes").notNull().default(0),
  caloriesBurned: integer("calories_burned").notNull().default(0),
  latestWeightKg: real("latest_weight_kg"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
