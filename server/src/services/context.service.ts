import { v5 as uuidv5 } from "uuid";
import { config } from "../config/index.js";
import { aiService } from "../lib/gemini.js";
import { vectorService } from "../lib/qdrant.js";
import type { ChatContext } from "../types/index.js";
import {
  formatDateLabel,
  getTodayDateString,
  normalizeKey,
  parseTimestampMs,
  polarityScore,
  recencyLabel,
  recencyWeight,
  UUID_NAMESPACE,
} from "../utils/helpers.js";

type FactEntry = {
  text: string;
  timestamp?: string;
  timestampMs: number;
  similarity: number;
  recency: number;
  combinedScore: number;
  key: string;
  polarity: number;
};

export async function buildChatContext(userId: string, message: string, apiKey?: string): Promise<ChatContext> {
  const vector = await aiService.generateEmbedding(message, apiKey);

  const [factResults, logResults, todaySummary] = await Promise.all([
    vectorService.search(vectorService.FACTS_COLLECTION, vector, 5, userId),
    vectorService.search(vectorService.LOGS_COLLECTION, vector, 5, userId),
    (async () => {
      const today = getTodayDateString();
      const summaryId = uuidv5(`${userId}_${today}`, UUID_NAMESPACE);
      return vectorService.getPoint(vectorService.SUMMARIES_COLLECTION, summaryId);
    })(),
  ]);

  const factEntries: FactEntry[] = factResults.reduce<FactEntry[]>((acc, item) => {
    const text = item.payload?.text as string | undefined;
    if (!text) {
      return acc;
    }

    const timestamp = item.payload?.timestamp as string | undefined;
    const similarity = typeof item.score === "number" ? item.score : 0;
    const recency = recencyWeight(timestamp);

    acc.push({
      text,
      timestamp,
      timestampMs: parseTimestampMs(timestamp),
      similarity,
      recency,
      combinedScore: similarity * recency,
      key: normalizeKey(text),
      polarity: polarityScore(text),
    });

    return acc;
  }, []);

  const filteredFacts = factEntries.filter(
    (entry) => entry.combinedScore >= config.ai.factScoreThreshold,
  );

  const conflicts: string[] = [];
  const byKey = new Map<string, FactEntry>();
  const factsByRecency = [...filteredFacts].sort((a, b) => b.timestampMs - a.timestampMs);

  for (const entry of factsByRecency) {
    const existing = byKey.get(entry.key);

    if (!existing) {
      byKey.set(entry.key, entry);
      continue;
    }

    if (entry.polarity !== 0 && existing.polarity !== 0 && entry.polarity !== existing.polarity) {
      conflicts.push(`"${existing.text}" vs "${entry.text}"`);
      if (entry.timestampMs >= existing.timestampMs) {
        byKey.set(entry.key, entry);
      }
      continue;
    }

    if (entry.combinedScore > existing.combinedScore) {
      byKey.set(entry.key, entry);
    }
  }

  const selectedFacts = Array.from(byKey.values())
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, config.ai.factLimit);

  const factsContext = selectedFacts.length
    ? selectedFacts
      .map((entry) => `- (${recencyLabel(entry.timestamp)} | ${formatDateLabel(entry.timestamp)}) ${entry.text}`)
      .join("\n")
    : "No known relevant facts.";

  const logsContext =
    logResults.map((item) => `- ${item.payload?.timestamp}: ${item.payload?.text}`).join("\n") ||
    "No relevant past logs.";
  const currentContext = (todaySummary?.payload?.text as string | undefined) || "No logs recorded yet today.";
  const conflictsContext = conflicts.length
    ? `\n[CONFLICTS DETECTED]:\n${conflicts.map((conflict) => `- ${conflict}`).join("\n")}\n`
    : "";

  return {
    factsContext,
    logsContext,
    currentContext,
    conflictsContext,
    combinedContextForVerifier: `
        [USER FACTS]:
        ${factsContext}
        
        [TODAY'S SUMMARY]:
        ${currentContext}
        
        [RELEVANT LOGS]:
        ${logsContext}
        ${conflictsContext}
        `,
    debug: {
      factsUsed: factResults.length,
      logsUsed: logResults.length,
      hasSummary: !!todaySummary,
      verification: "Enabled",
    },
  };
}
