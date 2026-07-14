import { Router } from "express";
import { aiService } from "../lib/gemini.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createChatSchema } from "../schemas/chat.schema.js";
import { buildChatContext } from "../services/context.service.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { logger } from "../utils/logger.js";

export const chatRouter = Router();

chatRouter.post(
  "/chat",
  requireAuth,
  validate(createChatSchema),
  async (req, res, next) => {
    try {
      const { message } = req.body;
      const authReq = req as AuthenticatedRequest;
      const context = await buildChatContext(authReq.user.id, message, authReq.geminiApiKey);

      logger.info("Processing chat request", {
        requestId: authReq.requestId,
        userId: authReq.user.id,
      });

      const systemPrompt = `
        You are an expert Health & Nutrition Coach utilizing an Agentic Cognitive Architecture.
        
        ### USER PROFILE (Long Term Memory)
        ${context.factsContext}
        ${context.conflictsContext}
        
        ### CURRENT STATUS (Working Memory - Today)
        ${context.currentContext}
        
        ### RELEVANT HISTORY (Episodic Memory)
        ${context.logsContext}
        
        ### USER QUERY
        "${message}"
        
        ### INSTRUCTIONS
        1. Analyze the User Profile to understand dietary patterns, calorie-related goals, exercise habits, symptoms, and food sensitivities.
        2. Check the Current Status to see how today's meals, exercise, hydration, sleep, and symptoms align with the user's health goals.
        3. Use Relevant History to find patterns in nutrition, tolerance, energy, recovery, and symptom triggers.
        4. Answer the query as a practical health coach. Be direct. If the user is doing something they previously said affects them negatively, point it out gently.
      `;

      const answer = await aiService.generateVerifiedResponse(
        systemPrompt,
        context.combinedContextForVerifier,
        authReq.geminiApiKey,
      );

      res.json({
        success: true,
        answer,
        debug: context.debug,
      });
    } catch (error) {
      next(error);
    }
  },
);
