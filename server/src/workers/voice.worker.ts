import fs from "node:fs/promises";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import connection from "../lib/redis.js";
import { db } from "../db/index.js";
import { logEntry, voiceLog } from "../db/schema.js";
import { aiService } from "../lib/gemini.js";
import { addLogJob } from "../lib/queue.js";
import { logger } from "../utils/logger.js";

export const voiceWorker = new Worker(
  "voice-processing",
  async (job) => {
    const { voiceLogId, userId, audioPath, mimeType, geminiApiKey } = job.data;

    try {
      logger.worker("Processing voice log", String(job.id), { voiceLogId, userId });

      const audioBuffer = await fs.readFile(audioPath);
      const transcript = await aiService.transcribeAudio(audioBuffer, mimeType, geminiApiKey);
      const logId = uuidv4();

      await db.insert(logEntry).values({
        id: logId,
        userId,
        content: transcript,
        type: "voice_log",
        status: "pending",
      });

      await addLogJob({
        logId,
        userId,
        text: transcript,
        geminiApiKey,
      });

      await db
        .update(voiceLog)
        .set({
          transcript,
          createdLogEntryId: logId,
          processingError: null,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(voiceLog.id, voiceLogId));

      return { success: true, logId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown voice processing error";

      logger.error("Failed to process voice log", error instanceof Error ? error : undefined, {
        voiceLogId,
        userId,
      });

      await db
        .update(voiceLog)
        .set({
          status: "failed",
          processingError: message,
          updatedAt: new Date(),
        })
        .where(eq(voiceLog.id, voiceLogId));

      throw error;
    }
  },
  { connection },
);

voiceWorker.on("completed", (job) => {
  logger.worker("Voice job completed successfully", String(job.id), {
    voiceLogId: job.data.voiceLogId,
    userId: job.data.userId,
  });
});

voiceWorker.on("failed", (job, err) => {
  logger.error("Voice worker job failed", err, {
    jobId: job?.id,
    voiceLogId: job?.data?.voiceLogId,
    userId: job?.data?.userId,
  });
});
