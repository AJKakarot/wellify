import { aiService } from "../lib/gemini.js";
import { vectorService } from "../lib/qdrant.js";
import type { FoodAnalysisResult, FoodEntryMode } from "../types/index.js";

type FoodLogVectorInput = {
  foodLogId: string;
  userId: string;
  mealType?: string | null;
  title?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  entryMode?: FoodEntryMode | null;
  analysis: FoodAnalysisResult;
};

export function buildFoodSummaryText(
  result: FoodAnalysisResult,
  options?: {
    title?: string | null;
    mealType?: string | null;
    notes?: string | null;
  },
): string {
  const detected = result.detectedFoods.length
    ? result.detectedFoods.map((food) => `${food.name} (${food.estimatedPortion})`).join(", ")
    : "Unknown foods";

  const parts = [
    options?.title ? `Meal: ${options.title}.` : null,
    options?.mealType ? `Meal type: ${options.mealType}.` : null,
    `Detected foods: ${detected}.`,
    result.totalCalories != null ? `Estimated calories: ${result.totalCalories}.` : null,
    result.notes ? `Analysis notes: ${result.notes}.` : null,
    options?.notes ? `User notes: ${options.notes}.` : null,
  ].filter(Boolean);

  return parts.join(" ");
}

export async function syncFoodLogVector(input: FoodLogVectorInput): Promise<void> {
  const summaryText = buildFoodSummaryText(input.analysis, {
    title: input.title,
    mealType: input.mealType,
    notes: input.notes,
  });
  const vector = await aiService.generateEmbedding(summaryText);

  await vectorService.upsertPoint(vectorService.LOGS_COLLECTION, input.foodLogId, vector, {
    text: summaryText,
    userId: input.userId,
    timestamp: new Date().toISOString(),
    type: "food_log",
    title: input.title ?? null,
    mealType: input.mealType ?? null,
    imageUrl: input.imageUrl ?? null,
    entryMode: input.entryMode ?? null,
    totalCalories: input.analysis.totalCalories,
  });
}
