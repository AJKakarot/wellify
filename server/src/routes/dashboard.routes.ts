import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { adherenceQuerySchema } from "../schemas/dashboard.schema.js";
import { adherenceService } from "../services/adherence.service.js";
import { dashboardService } from "../services/dashboard.service.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard/day", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const data = await dashboardService.getDashboard(authReq.user.id, "day");
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/dashboard/week", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const data = await dashboardService.getDashboard(authReq.user.id, "week");
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/goals/adherence", requireAuth, validate(adherenceQuerySchema, "query"), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const days = Number(req.query.days);
    const data = await adherenceService.getAdherence(authReq.user.id, days);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});
