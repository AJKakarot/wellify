import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { dailyHealthSummary, dailyNutritionSummary, foodLog, logEntry } from "../db/schema.js";
import type { AdherenceSummary } from "../types/index.js";
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

export const adherenceService = {
  async getAdherence(userId: string, days: number): Promise<AdherenceSummary> {
    const today = startOfToday();
    const startDate = addDays(today, -(days - 1));
    const from = toDateKey(startDate);
    const to = toDateKey(today);

    const [goals, nutritionSummaries, healthSummaries, completedFoodLogs, textLogs] = await Promise.all([
      nutritionService.getGoals(userId),
      db
        .select()
        .from(dailyNutritionSummary)
        .where(and(eq(dailyNutritionSummary.userId, userId), gte(dailyNutritionSummary.date, from), lte(dailyNutritionSummary.date, to))),
      db
        .select()
        .from(dailyHealthSummary)
        .where(and(eq(dailyHealthSummary.userId, userId), gte(dailyHealthSummary.date, from), lte(dailyHealthSummary.date, to))),
      db
        .select()
        .from(foodLog)
        .where(and(eq(foodLog.userId, userId), eq(foodLog.status, "completed"), gte(foodLog.loggedAt, startDate), lte(foodLog.loggedAt, new Date(`${to}T23:59:59.999Z`)))),
      db
        .select()
        .from(logEntry)
        .where(and(eq(logEntry.userId, userId), gte(logEntry.createdAt, startDate), lte(logEntry.createdAt, new Date(`${to}T23:59:59.999Z`)))),
    ]);

    const nutritionByDate = new Map(nutritionSummaries.map((item) => [item.date, item]));
    const healthByDate = new Map(healthSummaries.map((item) => [item.date, item]));
    const foodLogDates = new Set(completedFoodLogs.map((item) => item.loggedAt.toISOString().split("T")[0]));
    const textLogDates = new Set(textLogs.map((item) => item.createdAt.toISOString().split("T")[0]));

    let calorieGoalDaysHit = 0;
    let proteinGoalDaysHit = 0;
    let hydrationDaysHit = 0;
    let exerciseDaysHit = 0;
    let loggingDaysHit = 0;

    for (let cursor = new Date(startDate); cursor <= today; cursor = addDays(cursor, 1)) {
      const date = toDateKey(cursor);
      const nutrition = nutritionByDate.get(date);
      const health = healthByDate.get(date);

      if (goals?.dailyCalories != null && (nutrition?.totalCalories ?? 0) <= goals.dailyCalories) {
        calorieGoalDaysHit += 1;
      }
      if (goals?.dailyProtein != null && (nutrition?.totalProtein ?? 0) >= goals.dailyProtein) {
        proteinGoalDaysHit += 1;
      }
      if ((health?.waterMl ?? 0) >= 2000) {
        hydrationDaysHit += 1;
      }
      if ((health?.exerciseMinutes ?? 0) >= 20) {
        exerciseDaysHit += 1;
      }
      if (foodLogDates.has(date) || textLogDates.has(date)) {
        loggingDaysHit += 1;
      }
    }

    return {
      days,
      calorieGoalDaysHit,
      proteinGoalDaysHit,
      hydrationDaysHit,
      exerciseDaysHit,
      loggingDaysHit,
      summaryText: `${proteinGoalDaysHit} of last ${days} days hit protein goal, ${hydrationDaysHit} met hydration, and ${exerciseDaysHit} included exercise.`,
    };
  },
};
