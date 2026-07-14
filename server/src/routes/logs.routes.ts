import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { logEntry } from "../db/schema.js";
import { addLogJob } from "../lib/queue.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createLogSchema } from "../schemas/logs.schema.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { logger } from "../utils/logger.js";

export const logsRouter = Router();

logsRouter.post(
  "/logs",
  requireAuth,
  validate(createLogSchema),
  async (req, res, next) => {
    try {
      const { content } = req.body;
      const authReq = req as AuthenticatedRequest;
      const logId = uuidv4();

      await db.insert(logEntry).values({
        id: logId,
        userId: authReq.user.id,
        content,
        status: "pending",
      });

      await addLogJob({
        logId,
        userId: authReq.user.id,
        text: content,
        geminiApiKey: authReq.geminiApiKey,
      });

      logger.info("Queued health log", {
        requestId: authReq.requestId,
        userId: authReq.user.id,
        logId,
      });

      res.json({
        success: true,
        id: logId,
        status: "queued",
        message: "Log saved and processing started",
      });
    } catch (error) {
      next(error);
    }
  },
);
