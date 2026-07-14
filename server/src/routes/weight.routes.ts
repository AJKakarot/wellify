import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { weightLog } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createWeightLogSchema, weightLogIdParamSchema } from "../schemas/weight.schema.js";
import { healthSummaryService } from "../services/health-summary.service.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { NotFoundError } from "../utils/errors.js";

export const weightRouter = Router();

function getRouteId(id: string | string[]): string {
  return Array.isArray(id) ? id[0] : id;
}

weightRouter.post("/weight", requireAuth, validate(createWeightLogSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { weightKg, notes, loggedAt } = req.body;
    const recordId = uuidv4();
    const effectiveLoggedAt = loggedAt ?? new Date();

    await db.insert(weightLog).values({
      id: recordId,
      userId: authReq.user.id,
      weightKg,
      notes,
      loggedAt: effectiveLoggedAt,
    });

    await healthSummaryService.refreshDailySummaryForDate(
      authReq.user.id,
      effectiveLoggedAt.toISOString().split("T")[0],
    );

    const [created] = await db.select().from(weightLog).where(eq(weightLog.id, recordId)).limit(1);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

weightRouter.get("/weight", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const records = await db.select().from(weightLog).where(eq(weightLog.userId, authReq.user.id)).orderBy(desc(weightLog.loggedAt));
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

weightRouter.delete("/weight/:id", requireAuth, validate(weightLogIdParamSchema, "params"), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = getRouteId(req.params.id);
    const [existing] = await db.select().from(weightLog).where(and(eq(weightLog.id, id), eq(weightLog.userId, authReq.user.id))).limit(1);
    if (!existing) throw new NotFoundError("Weight log");
    await db.delete(weightLog).where(eq(weightLog.id, id));
    await healthSummaryService.refreshDailySummaryForDate(authReq.user.id, existing.loggedAt.toISOString().split("T")[0]);
    res.json({ success: true, message: "Weight log deleted" });
  } catch (error) {
    next(error);
  }
});
