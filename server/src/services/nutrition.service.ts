import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { dailyNutritionSummary, foodLog, nutritionGoal } from "../db/schema.js";
import type {
  ActivityLevel,
  DailyNutritionSummaryRecord,
  GoalType,
  MealType,
  NutritionGoalRecord,
  NutritionPeriod,
} from "../types/index.js";

type GoalInput = {
  dailyCalories?: number | null;
  dailyProtein?: number | null;
  dailyCarbs?: number | null;
  dailyFat?: number | null;
  goalType?: GoalType | null;
  activityLevel?: ActivityLevel | null;
};

function toDateKey(value: Date): string {
  return value.toISOString().split("T")[0];
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getSummaryId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

function toNumber(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

function getMealBucketKey(mealType?: string | null): keyof Pick<
  DailyNutritionSummaryRecord,
  "breakfastCalories" | "lunchCalories" | "dinnerCalories" | "snackCalories"
> | null {
  switch (mealType as MealType | null) {
    case "breakfast":
      return "breakfastCalories";
    case "lunch":
      return "lunchCalories";
    case "dinner":
      return "dinnerCalories";
    case "snack":
      return "snackCalories";
    default:
      return null;
  }
}

export const nutritionService = {
  async getGoals(userId: string): Promise<NutritionGoalRecord | null> {
    const [goal] = await db.select().from(nutritionGoal).where(eq(nutritionGoal.userId, userId)).limit(1);
    if (!goal) {
      return null;
    }

    return {
      ...goal,
      goalType: goal.goalType as GoalType | null,
      activityLevel: goal.activityLevel as ActivityLevel | null,
    };
  },

  async upsertGoals(userId: string, input: GoalInput): Promise<NutritionGoalRecord> {
    const existing = await this.getGoals(userId);

    if (existing) {
      await db
        .update(nutritionGoal)
        .set({
          dailyCalories: input.dailyCalories ?? existing.dailyCalories,
          dailyProtein: input.dailyProtein ?? existing.dailyProtein,
          dailyCarbs: input.dailyCarbs ?? existing.dailyCarbs,
          dailyFat: input.dailyFat ?? existing.dailyFat,
          goalType: input.goalType ?? existing.goalType,
          activityLevel: input.activityLevel ?? existing.activityLevel,
          updatedAt: new Date(),
        })
        .where(eq(nutritionGoal.userId, userId));
    } else {
      await db.insert(nutritionGoal).values({
        id: userId,
        userId,
        dailyCalories: input.dailyCalories ?? null,
        dailyProtein: input.dailyProtein ?? null,
        dailyCarbs: input.dailyCarbs ?? null,
        dailyFat: input.dailyFat ?? null,
        goalType: input.goalType ?? null,
        activityLevel: input.activityLevel ?? null,
      });
    }

    const goal = await this.getGoals(userId);
    if (!goal) {
      throw new Error("Failed to upsert nutrition goals");
    }

    return goal;
  },

  async refreshDailySummaryForDate(userId: string, date: string): Promise<DailyNutritionSummaryRecord> {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const logs = await db
      .select()
      .from(foodLog)
      .where(
        and(
          eq(foodLog.userId, userId),
          eq(foodLog.status, "completed"),
          gte(foodLog.loggedAt, dayStart),
          lte(foodLog.loggedAt, dayEnd),
        ),
      );

    const totals: Omit<
      DailyNutritionSummaryRecord,
      "id" | "userId" | "date" | "createdAt" | "updatedAt"
    > = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      breakfastCalories: 0,
      lunchCalories: 0,
      dinnerCalories: 0,
      snackCalories: 0,
    };

    for (const log of logs) {
      const calories = toNumber(log.totalCalories);
      totals.totalCalories += calories;
      totals.totalProtein += toNumber(log.totalProtein);
      totals.totalCarbs += toNumber(log.totalCarbs);
      totals.totalFat += toNumber(log.totalFat);

      const bucket = getMealBucketKey(log.mealType);
      if (bucket) {
        totals[bucket] += calories;
      }
    }

    const summaryId = getSummaryId(userId, date);
    const [existing] = await db
      .select()
      .from(dailyNutritionSummary)
      .where(eq(dailyNutritionSummary.id, summaryId))
      .limit(1);

    if (existing) {
      await db
        .update(dailyNutritionSummary)
        .set({
          ...totals,
          updatedAt: new Date(),
        })
        .where(eq(dailyNutritionSummary.id, summaryId));
    } else {
      await db.insert(dailyNutritionSummary).values({
        id: summaryId,
        userId,
        date,
        ...totals,
      });
    }

    const [summary] = await db
      .select()
      .from(dailyNutritionSummary)
      .where(eq(dailyNutritionSummary.id, summaryId))
      .limit(1);

    if (!summary) {
      throw new Error("Failed to refresh daily nutrition summary");
    }

    return summary;
  },

  async getNutritionSummary(userId: string, period: NutritionPeriod) {
    const today = startOfToday();
    const startDate = period === "week" ? addDays(today, -6) : today;
    const from = toDateKey(startDate);
    const to = toDateKey(today);

    const summaries = await db
      .select()
      .from(dailyNutritionSummary)
      .where(
        and(
          eq(dailyNutritionSummary.userId, userId),
          gte(dailyNutritionSummary.date, from),
          lte(dailyNutritionSummary.date, to),
        ),
      );

    const aggregate = summaries.reduce(
      (acc, item) => {
        acc.totalCalories += toNumber(item.totalCalories);
        acc.totalProtein += toNumber(item.totalProtein);
        acc.totalCarbs += toNumber(item.totalCarbs);
        acc.totalFat += toNumber(item.totalFat);
        acc.breakfastCalories += toNumber(item.breakfastCalories);
        acc.lunchCalories += toNumber(item.lunchCalories);
        acc.dinnerCalories += toNumber(item.dinnerCalories);
        acc.snackCalories += toNumber(item.snackCalories);
        return acc;
      },
      {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        breakfastCalories: 0,
        lunchCalories: 0,
        dinnerCalories: 0,
        snackCalories: 0,
      },
    );

    const goal = await this.getGoals(userId);
    const dayCount = period === "week" ? 7 : 1;

    return {
      period,
      from,
      to,
      totals: aggregate,
      averagePerDay: {
        calories: aggregate.totalCalories / dayCount,
        protein: aggregate.totalProtein / dayCount,
        carbs: aggregate.totalCarbs / dayCount,
        fat: aggregate.totalFat / dayCount,
      },
      goalTargets: goal
        ? {
          calories: goal.dailyCalories,
          protein: goal.dailyProtein,
          carbs: goal.dailyCarbs,
          fat: goal.dailyFat,
        }
        : null,
      summaries,
    };
  },

  async getNutritionProgress(userId: string, days: number) {
    const today = startOfToday();
    const startDate = addDays(today, -(days - 1));
    const from = toDateKey(startDate);
    const to = toDateKey(today);

    const summaries = await db
      .select()
      .from(dailyNutritionSummary)
      .where(
        and(
          eq(dailyNutritionSummary.userId, userId),
          gte(dailyNutritionSummary.date, from),
          lte(dailyNutritionSummary.date, to),
        ),
      );

    const summaryMap = new Map(summaries.map((item) => [item.date, item]));
    const goal = await this.getGoals(userId);
    const points = [];

    for (let cursor = new Date(startDate); cursor <= today; cursor = addDays(cursor, 1)) {
      const date = toDateKey(cursor);
      const summary = summaryMap.get(date);

      points.push({
        date,
        calories: summary?.totalCalories ?? 0,
        protein: summary?.totalProtein ?? 0,
        carbs: summary?.totalCarbs ?? 0,
        fat: summary?.totalFat ?? 0,
        goalCalories: goal?.dailyCalories ?? null,
        goalProtein: goal?.dailyProtein ?? null,
        goalCarbs: goal?.dailyCarbs ?? null,
        goalFat: goal?.dailyFat ?? null,
      });
    }

    return {
      from,
      to,
      days,
      points,
    };
  },
};
