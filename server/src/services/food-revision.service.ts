import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { foodLogRevision } from "../db/schema.js";
import type {
  FoodAnalysisResult,
  FoodEntryMode,
  FoodLogRevisionPayload,
  FoodLogRevisionType,
  MealType,
} from "../types/index.js";

type CreateFoodRevisionInput = {
  foodLogId: string;
  userId: string;
  revisionType: FoodLogRevisionType;
  analysis: FoodAnalysisResult;
  title?: string | null;
  mealType?: MealType | null;
  notes?: string | null;
  imageUrl?: string | null;
  entryMode?: FoodEntryMode | null;
};

export const foodRevisionService = {
  async createRevision(input: CreateFoodRevisionInput) {
    const payload: FoodLogRevisionPayload = {
      ...input.analysis,
      title: input.title ?? null,
      mealType: input.mealType ?? null,
      notes: input.notes ?? null,
      imageUrl: input.imageUrl ?? null,
      entryMode: input.entryMode ?? null,
    };

    await db.insert(foodLogRevision).values({
      id: uuidv4(),
      foodLogId: input.foodLogId,
      userId: input.userId,
      revisionType: input.revisionType,
      data: payload,
    });
  },
};
