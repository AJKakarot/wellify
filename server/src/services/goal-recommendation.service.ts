import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { dailyHealthSummary, dailyNutritionSummary } from "../db/schema.js";
import type { GoalRecommendation } from "../types/index.js";
import { nutritionService } from "./nutrition.service.js";

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(value: Date): string {
  return value.toISOString().split("T")[0];
}

function toNumber(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const goalRecommendationService = {
  async getRecommendations(userId: string, days: number): Promise<{ from: string; to: string; recommendation: GoalRecommendation }> {
    const today = startOfToday();
    const startDate = addDays(today, -(days - 1));
    const from = toDateKey(startDate);
    const to = toDateKey(today);

    const [goal, nutritionSummaries, healthSummaries] = await Promise.all([
      nutritionService.getGoals(userId),
      db
        .select()
        .from(dailyNutritionSummary)
        .where(and(eq(dailyNutritionSummary.userId, userId), gte(dailyNutritionSummary.date, from), lte(dailyNutritionSummary.date, to))),
      db
        .select()
        .from(dailyHealthSummary)
        .where(and(eq(dailyHealthSummary.userId, userId), gte(dailyHealthSummary.date, from), lte(dailyHealthSummary.date, to))),
    ]);

    const dayCount = Math.max(1, nutritionSummaries.length || healthSummaries.length || days);
    const avgCalories = nutritionSummaries.reduce((sum, item) => sum + toNumber(item.totalCalories), 0) / dayCount;
    const avgProtein = nutritionSummaries.reduce((sum, item) => sum + toNumber(item.totalProtein), 0) / dayCount;
    const avgExerciseMinutes = healthSummaries.reduce((sum, item) => sum + toNumber(item.exerciseMinutes), 0) / dayCount;
    const latestWeight = [...healthSummaries].sort((a, b) => b.date.localeCompare(a.date)).find((item) => item.latestWeightKg != null)?.latestWeightKg ?? null;

    let suggestedCalories = avgCalories || goal?.dailyCalories || null;
    const reasoning: string[] = [];

    if (suggestedCalories != null) {
      if (goal?.goalType === "lose") {
        suggestedCalories = clamp(Math.round(suggestedCalories - 250), 1200, 4000);
        reasoning.push("Adjusted calories slightly below recent intake to support a weight-loss goal.");
      } else if (goal?.goalType === "gain") {
        suggestedCalories = clamp(Math.round(suggestedCalories + 200), 1200, 4500);
        reasoning.push("Adjusted calories slightly above recent intake to support a weight-gain goal.");
      } else {
        suggestedCalories = clamp(Math.round(suggestedCalories), 1200, 4200);
        reasoning.push("Kept calories near recent intake to support maintenance.");
      }

      if (avgExerciseMinutes >= 40) {
        suggestedCalories = clamp(suggestedCalories + 100, 1200, 4500);
        reasoning.push("Added a small calorie buffer because recent activity has been fairly high.");
      }
    }

    const weightBasedProtein = latestWeight ? Math.round(latestWeight * 1.6) : null;
    const suggestedProtein = goal?.dailyProtein ?? weightBasedProtein ?? (avgProtein ? Math.round(Math.max(avgProtein, 110)) : 110);
    const suggestedFat = suggestedCalories != null ? Math.round((suggestedCalories * 0.27) / 9) : goal?.dailyFat ?? null;
    const suggestedCarbs = suggestedCalories != null && suggestedProtein != null && suggestedFat != null
      ? Math.round((suggestedCalories - (suggestedProtein * 4 + suggestedFat * 9)) / 4)
      : goal?.dailyCarbs ?? null;

    if (latestWeight != null) {
      reasoning.push(`Used the latest recorded weight (${latestWeight.toFixed(1)} kg) to anchor protein guidance.`);
    }
    if (avgProtein > 0) {
      reasoning.push(`Recent average protein intake was ${Math.round(avgProtein)}g per day.`);
    }
    if (!reasoning.length) {
      reasoning.push("Not enough recent data was available, so the suggestion falls back to simple baseline targets.");
    }

    return {
      from,
      to,
      recommendation: {
        suggestedCalories,
        suggestedProtein,
        suggestedCarbs,
        suggestedFat,
        reasoning,
      },
    };
  },
};
