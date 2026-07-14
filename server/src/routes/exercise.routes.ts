import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { exerciseLog } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createExerciseLogSchema, exerciseLogIdParamSchema } from "../schemas/exercise.schema.js";
import { healthSummaryService } from "../services/health-summary.service.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { NotFoundError } from "../utils/errors.js";

export const exerciseRouter = Router();

function getRouteId(id: string | string[]): string {
  return Array.isArray(id) ? id[0] : id;
}

exerciseRouter.post("/exercise", requireAuth, validate(createExerciseLogSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { activityType, durationMinutes, estimatedCaloriesBurned, notes, loggedAt } = req.body;
    const recordId = uuidv4();
    const effectiveLoggedAt = loggedAt ?? new Date();

    await db.insert(exerciseLog).values({
      id: recordId,
      userId: authReq.user.id,
      activityType,
      durationMinutes,
      estimatedCaloriesBurned: estimatedCaloriesBurned ?? null,
      notes,
      loggedAt: effectiveLoggedAt,
    });

    await healthSummaryService.refreshDailySummaryForDate(
      authReq.user.id,
      effectiveLoggedAt.toISOString().split("T")[0],
    );

    const [created] = await db.select().from(exerciseLog).where(eq(exerciseLog.id, recordId)).limit(1);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

exerciseRouter.get("/exercise", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const records = await db.select().from(exerciseLog).where(eq(exerciseLog.userId, authReq.user.id)).orderBy(desc(exerciseLog.loggedAt));
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

exerciseRouter.delete("/exercise/:id", requireAuth, validate(exerciseLogIdParamSchema, "params"), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = getRouteId(req.params.id);
    const [existing] = await db.select().from(exerciseLog).where(and(eq(exerciseLog.id, id), eq(exerciseLog.userId, authReq.user.id))).limit(1);
    if (!existing) throw new NotFoundError("Exercise log");
    await db.delete(exerciseLog).where(eq(exerciseLog.id, id));
    await healthSummaryService.refreshDailySummaryForDate(authReq.user.id, existing.loggedAt.toISOString().split("T")[0]);
    res.json({ success: true, message: "Exercise log deleted" });
  } catch (error) {
    next(error);
  }
});
