import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { dailyHealthSummary, dailyNutritionSummary } from "../db/schema.js";
import type { WeeklyInsightItem } from "../types/index.js";
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

export const insightService = {
  async getWeeklyInsights(userId: string): Promise<{ from: string; to: string; insights: WeeklyInsightItem[] }> {
    const today = startOfToday();
    const startDate = addDays(today, -6);
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

    const insights: WeeklyInsightItem[] = [];
    const avgProtein = nutritionSummaries.length
      ? nutritionSummaries.reduce((sum, item) => sum + toNumber(item.totalProtein), 0) / nutritionSummaries.length
      : 0;
    const avgWater = healthSummaries.length
      ? healthSummaries.reduce((sum, item) => sum + toNumber(item.waterMl), 0) / healthSummaries.length
      : 0;
    const avgCalories = nutritionSummaries.length
      ? nutritionSummaries.reduce((sum, item) => sum + toNumber(item.totalCalories), 0) / nutritionSummaries.length
      : 0;
    const avgExercise = healthSummaries.length
      ? healthSummaries.reduce((sum, item) => sum + toNumber(item.exerciseMinutes), 0) / healthSummaries.length
      : 0;

    const dinnerHeavyDays = nutritionSummaries.filter((item) => {
      const total = toNumber(item.totalCalories);
      return total > 0 && toNumber(item.dinnerCalories) / total >= 0.45;
    }).length;

    if (goal?.dailyProtein != null) {
      if (avgProtein < goal.dailyProtein * 0.85) {
        insights.push({
          type: "protein",
          title: "Protein is trending low",
          message: `Average protein intake was ${Math.round(avgProtein)}g, below your ${Math.round(goal.dailyProtein)}g target.`,
          severity: "warning",
        });
      } else {
        insights.push({
          type: "protein",
          title: "Protein intake looks solid",
          message: `Average protein intake stayed close to target at ${Math.round(avgProtein)}g per day.`,
          severity: "positive",
        });
      }
    }

    if (avgWater < 1800) {
      insights.push({
        type: "hydration",
        title: "Hydration dipped this week",
        message: `Average water intake was about ${Math.round(avgWater)}ml per day. A 2000ml baseline would be a good next target.`,
        severity: "warning",
      });
    }

    if (goal?.dailyCalories != null && avgCalories > goal.dailyCalories * 1.1) {
      insights.push({
        type: "calories",
        title: "Calories ran above target",
        message: `Average daily calories were ${Math.round(avgCalories)}, which is above your ${goal.dailyCalories} goal.`,
        severity: "warning",
      });
    }

    if (dinnerHeavyDays >= 3) {
      insights.push({
        type: "calories",
        title: "Dinner is carrying a lot of calories",
        message: `${dinnerHeavyDays} of the last 7 days had 45% or more of calories at dinner.`,
        severity: "info",
      });
    }

    if (avgExercise < 20) {
      insights.push({
        type: "exercise",
        title: "Activity is a growth opportunity",
        message: `Average exercise time was ${Math.round(avgExercise)} minutes per day this week.`,
        severity: "info",
      });
    }

    if (!insights.length) {
      insights.push({
        type: "logging",
        title: "Data is stable this week",
        message: "Your nutrition and health logs do not show any major weekly warning signals right now.",
        severity: "positive",
      });
    }

    return { from, to, insights };
  },
};
