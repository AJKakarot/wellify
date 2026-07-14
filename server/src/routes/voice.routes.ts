import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { voiceLog } from "../db/schema.js";
import { addVoiceJob } from "../lib/queue.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { voiceUpload } from "../middleware/audio-upload.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createVoiceLogSchema, voiceLogIdParamSchema } from "../schemas/voice.schema.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export const voiceRouter = Router();

function getRouteId(id: string | string[]): string {
  return Array.isArray(id) ? id[0] : id;
}

voiceRouter.post(
  "/voice-logs",
  requireAuth,
  voiceUpload.single("audio"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { durationSeconds } = createVoiceLogSchema.parse(req.body);
      const file = req.file;

      if (!file) {
        throw new AppError("Audio file is required", 400, "AUDIO_REQUIRED");
      }

      const voiceLogId = uuidv4();
      const audioUrl = `/uploads/voice/${file.filename}`;

      await db.insert(voiceLog).values({
        id: voiceLogId,
        userId: authReq.user.id,
        audioUrl,
        storagePath: file.path,
        mimeType: file.mimetype,
        originalFilename: file.originalname,
        durationSeconds,
        status: "pending",
      });

      await addVoiceJob({
        voiceLogId,
        userId: authReq.user.id,
        audioPath: file.path,
        mimeType: file.mimetype,
        geminiApiKey: authReq.geminiApiKey,
      });

      logger.info("Queued voice log", {
        requestId: authReq.requestId,
        userId: authReq.user.id,
        voiceLogId,
      });

      res.status(201).json({
        success: true,
        id: voiceLogId,
        status: "queued",
        audioUrl,
      });
    } catch (error) {
      next(error);
    }
  },
);

voiceRouter.get("/voice-logs", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const records = await db
      .select()
      .from(voiceLog)
      .where(eq(voiceLog.userId, authReq.user.id))
      .orderBy(desc(voiceLog.createdAt));

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
});

voiceRouter.get(
  "/voice-logs/:id",
  requireAuth,
  validate(voiceLogIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const voiceLogId = getRouteId(req.params.id);

      const [record] = await db
        .select()
        .from(voiceLog)
        .where(and(eq(voiceLog.id, voiceLogId), eq(voiceLog.userId, authReq.user.id)))
        .limit(1);

      if (!record) {
        throw new NotFoundError("Voice log");
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
