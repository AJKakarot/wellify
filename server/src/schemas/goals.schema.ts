import { z } from "zod";

export const nutritionPeriodSchema = z.enum(["day", "week"]);
export const goalTypeSchema = z.enum(["lose", "maintain", "gain"]);
export const activityLevelSchema = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);

export const upsertGoalsSchema = z.object({
  dailyCalories: z.number().int().positive().nullable().optional(),
  dailyProtein: z.number().nonnegative().nullable().optional(),
  dailyCarbs: z.number().nonnegative().nullable().optional(),
  dailyFat: z.number().nonnegative().nullable().optional(),
  goalType: goalTypeSchema.nullable().optional(),
  activityLevel: activityLevelSchema.nullable().optional(),
});

export const nutritionSummaryQuerySchema = z.object({
  period: nutritionPeriodSchema.default("day"),
});

export const nutritionProgressQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const goalRecommendationQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(14),
});
