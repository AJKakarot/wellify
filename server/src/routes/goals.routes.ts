import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  goalRecommendationQuerySchema,
  nutritionProgressQuerySchema,
  nutritionSummaryQuerySchema,
  upsertGoalsSchema,
} from "../schemas/goals.schema.js";
import { goalRecommendationService } from "../services/goal-recommendation.service.js";
import { nutritionService } from "../services/nutrition.service.js";
import type { AuthenticatedRequest, NutritionPeriod } from "../types/index.js";

export const goalsRouter = Router();

goalsRouter.get("/goals", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const goals = await nutritionService.getGoals(authReq.user.id);

    res.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    next(error);
  }
});

goalsRouter.put("/goals", requireAuth, validate(upsertGoalsSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const goals = await nutritionService.upsertGoals(authReq.user.id, req.body);

    res.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    next(error);
  }
});

goalsRouter.get(
  "/goals/nutrition",
  requireAuth,
  validate(nutritionSummaryQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const period = req.query.period as NutritionPeriod;
      const summary = await nutritionService.getNutritionSummary(authReq.user.id, period);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },
);

goalsRouter.get(
  "/goals/progress",
  requireAuth,
  validate(nutritionProgressQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const days = Number(req.query.days);
      const progress = await nutritionService.getNutritionProgress(authReq.user.id, days);

      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  },
);

goalsRouter.get(
  "/goals/recommendations",
  requireAuth,
  validate(goalRecommendationQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const days = Number(req.query.days);
      const recommendations = await goalRecommendationService.getRecommendations(authReq.user.id, days);

      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  },
);
