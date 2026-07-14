import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { insightService } from "../services/insight.service.js";

export const insightsRouter = Router();

insightsRouter.get("/insights/weekly", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const data = await insightService.getWeeklyInsights(authReq.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});
