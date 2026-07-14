import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { waterLog } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createWaterLogSchema, waterLogIdParamSchema } from "../schemas/water.schema.js";
import { healthSummaryService } from "../services/health-summary.service.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { NotFoundError } from "../utils/errors.js";

export const waterRouter = Router();

function getRouteId(id: string | string[]): string {
  return Array.isArray(id) ? id[0] : id;
}

waterRouter.post("/water", requireAuth, validate(createWaterLogSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { amountMl, loggedAt } = req.body;
    const recordId = uuidv4();
    const effectiveLoggedAt = loggedAt ?? new Date();

    await db.insert(waterLog).values({
      id: recordId,
      userId: authReq.user.id,
      amountMl,
      loggedAt: effectiveLoggedAt,
    });

    await healthSummaryService.refreshDailySummaryForDate(
      authReq.user.id,
      effectiveLoggedAt.toISOString().split("T")[0],
    );

    const [created] = await db.select().from(waterLog).where(eq(waterLog.id, recordId)).limit(1);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
});

waterRouter.get("/water", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const records = await db.select().from(waterLog).where(eq(waterLog.userId, authReq.user.id)).orderBy(desc(waterLog.loggedAt));
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

waterRouter.delete("/water/:id", requireAuth, validate(waterLogIdParamSchema, "params"), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = getRouteId(req.params.id);
    const [existing] = await db.select().from(waterLog).where(and(eq(waterLog.id, id), eq(waterLog.userId, authReq.user.id))).limit(1);
    if (!existing) throw new NotFoundError("Water log");
    await db.delete(waterLog).where(eq(waterLog.id, id));
    await healthSummaryService.refreshDailySummaryForDate(authReq.user.id, existing.loggedAt.toISOString().split("T")[0]);
    res.json({ success: true, message: "Water log deleted" });
  } catch (error) {
    next(error);
  }
});
