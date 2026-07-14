import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { dailyHealthSummary, dailyNutritionSummary } from "../db/schema.js";
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

export const dashboardService = {
  async getDashboard(userId: string, period: "day" | "week") {
    const today = startOfToday();
    const startDate = period === "week" ? addDays(today, -6) : today;
    const from = toDateKey(startDate);
    const to = toDateKey(today);

    const [nutritionSummaries, healthSummaries, goals] = await Promise.all([
      db
        .select()
        .from(dailyNutritionSummary)
        .where(and(eq(dailyNutritionSummary.userId, userId), gte(dailyNutritionSummary.date, from), lte(dailyNutritionSummary.date, to))),
      db
        .select()
        .from(dailyHealthSummary)
        .where(and(eq(dailyHealthSummary.userId, userId), gte(dailyHealthSummary.date, from), lte(dailyHealthSummary.date, to))),
      nutritionService.getGoals(userId),
    ]);

    const nutritionByDate = new Map(nutritionSummaries.map((item) => [item.date, item]));
    const healthByDate = new Map(healthSummaries.map((item) => [item.date, item]));
    const days = [];

    for (let cursor = new Date(startDate); cursor <= today; cursor = addDays(cursor, 1)) {
      const date = toDateKey(cursor);
      const nutrition = nutritionByDate.get(date);
      const health = healthByDate.get(date);

      days.push({
        date,
        nutrition: {
          calories: nutrition?.totalCalories ?? 0,
          protein: nutrition?.totalProtein ?? 0,
          carbs: nutrition?.totalCarbs ?? 0,
          fat: nutrition?.totalFat ?? 0,
          breakfastCalories: nutrition?.breakfastCalories ?? 0,
          lunchCalories: nutrition?.lunchCalories ?? 0,
          dinnerCalories: nutrition?.dinnerCalories ?? 0,
          snackCalories: nutrition?.snackCalories ?? 0,
        },
        health: {
          waterMl: health?.waterMl ?? 0,
          exerciseMinutes: health?.exerciseMinutes ?? 0,
          caloriesBurned: health?.caloriesBurned ?? 0,
          latestWeightKg: health?.latestWeightKg ?? null,
        },
      });
    }

    return {
      period,
      from,
      to,
      goals: goals
        ? {
          calories: goals.dailyCalories,
          protein: goals.dailyProtein,
          carbs: goals.dailyCarbs,
          fat: goals.dailyFat,
        }
        : null,
      totals: days.reduce(
        (acc, day) => {
          acc.calories += day.nutrition.calories;
          acc.protein += day.nutrition.protein;
          acc.carbs += day.nutrition.carbs;
          acc.fat += day.nutrition.fat;
          acc.waterMl += day.health.waterMl;
          acc.exerciseMinutes += day.health.exerciseMinutes;
          acc.caloriesBurned += day.health.caloriesBurned;
          return acc;
        },
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          waterMl: 0,
          exerciseMinutes: 0,
          caloriesBurned: 0,
        },
      ),
      latestWeightKg: [...days].reverse().find((day) => day.health.latestWeightKg != null)?.health.latestWeightKg ?? null,
      days,
    };
  },
};
