import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { dailyHealthSummary, exerciseLog, weightLog, waterLog } from "../db/schema.js";
import type { DailyHealthSummaryRecord } from "../types/index.js";

function getSummaryId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

function toNumber(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

export const healthSummaryService = {
  async refreshDailySummaryForDate(userId: string, date: string): Promise<DailyHealthSummaryRecord> {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const [waterLogs, exerciseLogs, latestWeight] = await Promise.all([
      db
        .select()
        .from(waterLog)
        .where(and(eq(waterLog.userId, userId), gte(waterLog.loggedAt, dayStart), lte(waterLog.loggedAt, dayEnd))),
      db
        .select()
        .from(exerciseLog)
        .where(and(eq(exerciseLog.userId, userId), gte(exerciseLog.loggedAt, dayStart), lte(exerciseLog.loggedAt, dayEnd))),
      db
        .select()
        .from(weightLog)
        .where(and(eq(weightLog.userId, userId), gte(weightLog.loggedAt, dayStart), lte(weightLog.loggedAt, dayEnd)))
        .orderBy(desc(weightLog.loggedAt))
        .limit(1),
    ]);

    const totals = {
      waterMl: waterLogs.reduce((sum, item) => sum + item.amountMl, 0),
      exerciseMinutes: exerciseLogs.reduce((sum, item) => sum + item.durationMinutes, 0),
      caloriesBurned: exerciseLogs.reduce((sum, item) => sum + toNumber(item.estimatedCaloriesBurned), 0),
      latestWeightKg: latestWeight[0]?.weightKg ?? null,
    };

    const summaryId = getSummaryId(userId, date);
    const [existing] = await db
      .select()
      .from(dailyHealthSummary)
      .where(eq(dailyHealthSummary.id, summaryId))
      .limit(1);

    if (existing) {
      await db
        .update(dailyHealthSummary)
        .set({
          ...totals,
          updatedAt: new Date(),
        })
        .where(eq(dailyHealthSummary.id, summaryId));
    } else {
      await db.insert(dailyHealthSummary).values({
        id: summaryId,
        userId,
        date,
        ...totals,
      });
    }

    const [summary] = await db
      .select()
      .from(dailyHealthSummary)
      .where(eq(dailyHealthSummary.id, summaryId))
      .limit(1);

    if (!summary) {
      throw new Error("Failed to refresh daily health summary");
    }

    return summary;
  },
};
