import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { v4 as uuidv4, v5 as uuidv5 } from "uuid";
import connection from "../lib/redis.js";
import { aiService } from "../lib/gemini.js";
import { vectorService } from "../lib/qdrant.js";
import { db } from "../db/index.js";
import { logEntry } from "../db/schema.js";
import { logger } from "../utils/logger.js";
import { getTodayDateString, UUID_NAMESPACE } from "../utils/helpers.js";

export const logWorker = new Worker(
  "log-processing",
  async (job) => {
    const { logId, userId, text, geminiApiKey } = job.data;

    try {
      logger.worker("Processing log", String(job.id), { logId, userId });

      const logVector = await aiService.generateEmbedding(text, geminiApiKey);
      await vectorService.upsertPoint(vectorService.LOGS_COLLECTION, logId, logVector, {
        text: text,
        userId: userId,
        timestamp: new Date().toISOString(),
        type: "health_log"
      });

      logger.worker("Extracting facts", String(job.id), { logId, userId });
      const facts = await aiService.extractFacts(text, geminiApiKey);

      if (facts.length > 0) {
        logger.info("Extracted facts from health log", { logId, userId, factsCount: facts.length });
      
        for (const fact of facts) {
            const factId = uuidv4();
            const factVector = await aiService.generateEmbedding(fact, geminiApiKey);
            
            await vectorService.upsertPoint(vectorService.FACTS_COLLECTION, factId, factVector, {
                text: fact,
                sourceLogId: logId, 
                userId: userId,
                timestamp: new Date().toISOString(),
                type: "fact"
            });
        }
      } else {
        logger.info("No facts extracted from health log", { logId, userId });
      }


      logger.worker("Updating daily summary", String(job.id), { logId, userId });
      
    
      const today = getTodayDateString();
      const deterministicId = uuidv5(`${userId}_${today}`, UUID_NAMESPACE);

      const existingPoint = await vectorService.getPoint(vectorService.SUMMARIES_COLLECTION, deterministicId);
      const currentSummaryText = existingPoint?.payload?.text as string || null;

      const updatedSummary = await aiService.updateDailySummary(currentSummaryText, text, geminiApiKey);
      logger.debug("Daily summary updated", { logId, userId, date: today });

      const summaryVector = await aiService.generateEmbedding(updatedSummary, geminiApiKey);
      
      await vectorService.upsertPoint(vectorService.SUMMARIES_COLLECTION, deterministicId, summaryVector, {
        text: updatedSummary,
        userId: userId,
        date: today,
        type: "daily_summary",
        lastUpdated: new Date().toISOString()
      });


      
      await db
        .update(logEntry)
        .set({ status: "processed", updatedAt: new Date() })
        .where(eq(logEntry.id, logId));

      return { success: true, factsCount: facts.length };

    } catch (error) {
      logger.error(`Failed to process log ${logId}`, error instanceof Error ? error : undefined, {
        logId,
        userId,
      });
      await db.update(logEntry).set({ status: "failed" }).where(eq(logEntry.id, logId));
      throw error;
    }
  },
  { connection }
);


logWorker.on("completed", (job) => {
  logger.worker("Job completed successfully", String(job.id), {
    logId: job.data.logId,
    userId: job.data.userId,
  });
});

logWorker.on("failed", (job, err) => {
  logger.error("Worker job failed", err, {
    jobId: job?.id,
    logId: job?.data?.logId,
    userId: job?.data?.userId,
  });
  // TODO: Integrate with Sentry or monitoring service
  // Sentry.captureException(err, { extra: { jobId: job?.id, logId: job?.data?.logId } });
});
