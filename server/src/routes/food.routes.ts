import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { foodLog, foodLogRevision } from "../db/schema.js";
import { addFoodJob } from "../lib/queue.js";
import { vectorService } from "../lib/qdrant.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { foodUpload } from "../middleware/upload.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  createFoodLogSchema,
  createManualFoodLogSchema,
  foodLogIdParamSchema,
  updateFoodLogSchema,
} from "../schemas/food.schema.js";
import { buildFoodSummaryText, syncFoodLogVector } from "../services/food-log.service.js";
import { foodRevisionService } from "../services/food-revision.service.js";
import { nutritionService } from "../services/nutrition.service.js";
import type { AuthenticatedRequest, FoodEntryMode, MealType } from "../types/index.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export const foodRouter = Router();

function getRouteId(id: string | string[]): string {
  return Array.isArray(id) ? id[0] : id;
}

foodRouter.post(
  "/food/manual",
  requireAuth,
  validate(createManualFoodLogSchema),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const {
        title,
        mealType,
        notes,
        loggedAt,
        detectedFoods,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      } = req.body;

      const foodLogId = uuidv4();
      const analysis = {
        detectedFoods,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        notes: null,
      };

      await db.insert(foodLog).values({
        id: foodLogId,
        userId: authReq.user.id,
        title,
        entryMode: "manual",
        mealType,
        notes,
        detectedFoods,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        status: "completed",
        loggedAt: loggedAt ?? new Date(),
      });

      await foodRevisionService.createRevision({
        foodLogId,
        userId: authReq.user.id,
        revisionType: "manual_initial",
        analysis,
        title,
        mealType,
        notes,
        entryMode: "manual",
      });

      await syncFoodLogVector({
        foodLogId,
        userId: authReq.user.id,
        title,
        mealType,
        notes,
        entryMode: "manual",
        analysis,
      });

      await nutritionService.refreshDailySummaryForDate(
        authReq.user.id,
        (loggedAt ?? new Date()).toISOString().split("T")[0],
      );

      const [created] = await db.select().from(foodLog).where(eq(foodLog.id, foodLogId)).limit(1);

      logger.info("Created manual food log", {
        requestId: authReq.requestId,
        userId: authReq.user.id,
        foodLogId,
      });

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      next(error);
    }
  },
);

foodRouter.post(
  "/food",
  requireAuth,
  foodUpload.single("image"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const parsedBody = createFoodLogSchema.parse(req.body);
      const file = req.file;

      if (!file) {
        throw new AppError("Image is required", 400, "IMAGE_REQUIRED");
      }

      const foodLogId = uuidv4();
      const imageUrl = `/uploads/food/${path.basename(file.path)}`;

      await db.insert(foodLog).values({
        id: foodLogId,
        userId: authReq.user.id,
        title: null,
        entryMode: "photo",
        imageUrl,
        storagePath: file.path,
        mimeType: file.mimetype,
        originalFilename: file.originalname,
        mealType: parsedBody.mealType,
        notes: parsedBody.notes,
        status: "pending",
      });

      await addFoodJob({
        foodLogId,
        userId: authReq.user.id,
        imagePath: file.path,
        mimeType: file.mimetype,
        geminiApiKey: authReq.geminiApiKey,
      });

      logger.info("Queued food log", {
        requestId: authReq.requestId,
        userId: authReq.user.id,
        foodLogId,
      });

      res.status(201).json({
        success: true,
        id: foodLogId,
        status: "queued",
        imageUrl,
      });
    } catch (error) {
      next(error);
    }
  },
);

foodRouter.get(
  "/food/:id/history",
  requireAuth,
  validate(foodLogIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const foodLogId = getRouteId(req.params.id);
      const [record] = await db
        .select()
        .from(foodLog)
        .where(and(eq(foodLog.id, foodLogId), eq(foodLog.userId, authReq.user.id)))
        .limit(1);

      if (!record) {
        throw new NotFoundError("Food log");
      }

      const revisions = await db
        .select()
        .from(foodLogRevision)
        .where(and(eq(foodLogRevision.foodLogId, foodLogId), eq(foodLogRevision.userId, authReq.user.id)))
        .orderBy(foodLogRevision.createdAt);

      res.json({
        success: true,
        data: revisions,
      });
    } catch (error) {
      next(error);
    }
  },
);

foodRouter.get("/food", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const logs = await db
      .select()
      .from(foodLog)
      .where(eq(foodLog.userId, authReq.user.id))
      .orderBy(desc(foodLog.loggedAt));

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

foodRouter.get(
  "/food/:id",
  requireAuth,
  validate(foodLogIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const foodLogId = getRouteId(req.params.id);
      const [record] = await db
        .select()
        .from(foodLog)
        .where(and(eq(foodLog.id, foodLogId), eq(foodLog.userId, authReq.user.id)))
        .limit(1);

      if (!record) {
        throw new NotFoundError("Food log");
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  },
);

foodRouter.patch(
  "/food/:id",
  requireAuth,
  validate(foodLogIdParamSchema, "params"),
  validate(updateFoodLogSchema),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const foodLogId = getRouteId(req.params.id);
      const [existing] = await db
        .select()
        .from(foodLog)
        .where(and(eq(foodLog.id, foodLogId), eq(foodLog.userId, authReq.user.id)))
        .limit(1);

      if (!existing) {
        throw new NotFoundError("Food log");
      }

      const { correctedData, mealType, notes } = req.body;
      const title = req.body.title ?? existing.title;
      const nextMealType = (mealType ?? existing.mealType) as MealType | null | undefined;
      const nextNotes = notes ?? existing.notes;
      const nextEntryMode = (existing.entryMode === "photo" && correctedData
        ? "hybrid"
        : existing.entryMode) as FoodEntryMode | null | undefined;

      await db
        .update(foodLog)
        .set({
          title,
          mealType: mealType ?? existing.mealType,
          notes: notes ?? existing.notes,
          correctedData: correctedData ?? existing.correctedData,
          userCorrected: correctedData ? true : existing.userCorrected,
          detectedFoods: correctedData?.detectedFoods ?? existing.detectedFoods,
          totalCalories: correctedData?.totalCalories ?? existing.totalCalories,
          totalProtein: correctedData?.totalProtein ?? existing.totalProtein,
          totalCarbs: correctedData?.totalCarbs ?? existing.totalCarbs,
          totalFat: correctedData?.totalFat ?? existing.totalFat,
          status: existing.status === "pending" ? existing.status : "completed",
          processingError: correctedData ? null : existing.processingError,
          entryMode: nextEntryMode ?? existing.entryMode,
          updatedAt: new Date(),
        })
        .where(eq(foodLog.id, foodLogId));

      const nextAnalysis = correctedData
        ? {
          detectedFoods: correctedData.detectedFoods,
          totalCalories: correctedData.totalCalories,
          totalProtein: correctedData.totalProtein,
          totalCarbs: correctedData.totalCarbs,
          totalFat: correctedData.totalFat,
          notes: correctedData.notes ?? null,
        }
        : {
          detectedFoods: existing.detectedFoods ?? [],
          totalCalories: existing.totalCalories,
          totalProtein: existing.totalProtein,
          totalCarbs: existing.totalCarbs,
          totalFat: existing.totalFat,
          notes: null,
        };

      if (correctedData) {
        await foodRevisionService.createRevision({
          foodLogId,
          userId: authReq.user.id,
          revisionType: "user_edit",
          analysis: nextAnalysis,
          title,
          mealType: nextMealType,
          notes: nextNotes,
          imageUrl: existing.imageUrl,
          entryMode: nextEntryMode,
        });

        await syncFoodLogVector({
          foodLogId,
          userId: authReq.user.id,
          title,
          mealType: nextMealType,
          notes: nextNotes,
          imageUrl: existing.imageUrl,
          entryMode: nextEntryMode,
          analysis: nextAnalysis,
        });
      } else {
        const summaryText = buildFoodSummaryText(nextAnalysis, {
          title,
          mealType: nextMealType,
          notes: nextNotes,
        });
        logger.debug("Food log updated without correction payload", {
          foodLogId,
          userId: authReq.user.id,
          summaryPreview: summaryText,
        });
      }

      await nutritionService.refreshDailySummaryForDate(
        authReq.user.id,
        existing.loggedAt.toISOString().split("T")[0],
      );

      const [updated] = await db
        .select()
        .from(foodLog)
        .where(eq(foodLog.id, foodLogId))
        .limit(1);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
);

foodRouter.delete(
  "/food/:id",
  requireAuth,
  validate(foodLogIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const foodLogId = getRouteId(req.params.id);
      const [existing] = await db
        .select()
        .from(foodLog)
        .where(and(eq(foodLog.id, foodLogId), eq(foodLog.userId, authReq.user.id)))
        .limit(1);

      if (!existing) {
        throw new NotFoundError("Food log");
      }

      await db.delete(foodLog).where(eq(foodLog.id, foodLogId));
      await db.delete(foodLogRevision).where(eq(foodLogRevision.foodLogId, foodLogId));

      if (existing.storagePath) {
        await fs.unlink(existing.storagePath).catch(() => undefined);
      }

      await vectorService.deletePoint(vectorService.LOGS_COLLECTION, foodLogId).catch(() => undefined);
      await nutritionService.refreshDailySummaryForDate(
        authReq.user.id,
        existing.loggedAt.toISOString().split("T")[0],
      );

      res.json({
        success: true,
        message: "Food log deleted",
      });
    } catch (error) {
      next(error);
    }
  },
);
