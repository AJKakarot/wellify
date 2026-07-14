import fs from "node:fs/promises";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import connection from "../lib/redis.js";
import { aiService } from "../lib/gemini.js";
import { db } from "../db/index.js";
import { foodLog } from "../db/schema.js";
import { syncFoodLogVector } from "../services/food-log.service.js";
import { foodRevisionService } from "../services/food-revision.service.js";
import { nutritionService } from "../services/nutrition.service.js";
import type { FoodAnalysisResult, FoodEntryMode, MealType } from "../types/index.js";
import { logger } from "../utils/logger.js";

export const foodWorker = new Worker(
  "food-processing",
  async (job) => {
    const { foodLogId, userId, imagePath, mimeType, geminiApiKey } = job.data;

    try {
      logger.worker("Processing food log", String(job.id), { foodLogId, userId });

      const imageBuffer = await fs.readFile(imagePath);
      const analysis = await aiService.analyzeFood(imageBuffer, mimeType, geminiApiKey);

      const [existing] = await db.select().from(foodLog).where(eq(foodLog.id, foodLogId)).limit(1);

      await db
        .update(foodLog)
        .set({
          detectedFoods: analysis.detectedFoods,
          totalCalories: analysis.totalCalories,
          totalProtein: analysis.totalProtein,
          totalCarbs: analysis.totalCarbs,
          totalFat: analysis.totalFat,
          processingError: null,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(foodLog.id, foodLogId));

      await foodRevisionService.createRevision({
        foodLogId,
        userId,
        revisionType: "ai_initial",
        analysis,
        title: existing?.title ?? null,
        mealType: (existing?.mealType ?? null) as MealType | null,
        notes: existing?.notes ?? null,
        imageUrl: existing?.imageUrl ?? null,
        entryMode: (existing?.entryMode ?? null) as FoodEntryMode | null,
      });

      await syncFoodLogVector({
        foodLogId,
        userId,
        title: existing?.title ?? null,
        mealType: (existing?.mealType ?? null) as MealType | null,
        notes: existing?.notes ?? null,
        imageUrl: existing?.imageUrl ?? null,
        entryMode: (existing?.entryMode ?? null) as FoodEntryMode | null,
        analysis,
      });

      if (existing) {
        await nutritionService.refreshDailySummaryForDate(
          userId,
          existing.loggedAt.toISOString().split("T")[0],
        );
      }

      return { success: true, detectedFoods: analysis.detectedFoods.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown food processing error";

      logger.error("Failed to process food log", error instanceof Error ? error : undefined, {
        foodLogId,
        userId,
      });

      await db
        .update(foodLog)
        .set({
          status: "failed",
          processingError: message,
          updatedAt: new Date(),
        })
        .where(eq(foodLog.id, foodLogId));

      throw error;
    }
  },
  { connection },
);

foodWorker.on("completed", (job) => {
  logger.worker("Food job completed successfully", String(job.id), {
    foodLogId: job.data.foodLogId,
    userId: job.data.userId,
  });
});

foodWorker.on("failed", (job, err) => {
  logger.error("Food worker job failed", err, {
    jobId: job?.id,
    foodLogId: job?.data?.foodLogId,
    userId: job?.data?.userId,
  });
});
