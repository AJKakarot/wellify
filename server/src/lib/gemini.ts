import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/index.js";
import type { FoodAnalysisResult } from "../types/index.js";
import { AIServiceError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in environment variables");
}

// Default singleton client (server key)
const defaultGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getClient(apiKey?: string): GoogleGenerativeAI {
  if (apiKey) {
    return new GoogleGenerativeAI(apiKey);
  }
  return defaultGenAI;
}

function getEmbeddingModel(apiKey?: string) {
  return getClient(apiKey).getGenerativeModel({ model: config.gemini.embeddingModel });
}

function getChatModel(apiKey?: string) {
  return getClient(apiKey).getGenerativeModel({ model: config.gemini.chatModel });
}

function getJsonModel(apiKey?: string) {
  return getClient(apiKey).getGenerativeModel({
    model: config.gemini.chatModel,
    generationConfig: { responseMimeType: "application/json" },
  });
}

const FOOD_ANALYSIS_PROMPT = `
Analyze this meal photo and return strict JSON only.

Return an object with this shape:
{
  "detectedFoods": [
    {
      "name": "string",
      "estimatedPortion": "string",
      "calories": number | null,
      "protein": number | null,
      "carbs": number | null,
      "fat": number | null,
      "confidence": number | null
    }
  ],
  "totalCalories": number | null,
  "totalProtein": number | null,
  "totalCarbs": number | null,
  "totalFat": number | null,
  "notes": "string | null"
}

Rules:
- Estimate visible foods only.
- Use null when you cannot estimate a value safely.
- Keep numbers realistic for a single meal photo.
- Do not wrap the JSON in markdown fences.
`;

const AUDIO_TRANSCRIPTION_PROMPT = `
Transcribe this health voice note into clean plain text.

Rules:
- Return only the transcript.
- Do not summarize or explain.
- Preserve health details like meals, symptoms, exercise, hydration, sleep, and timing when audible.
- If some words are unclear, make the best reasonable transcription and keep going.
`;

export const aiService = {

  async generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
    try {
      const result = await getEmbeddingModel(apiKey).embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error("Error generating embedding", error instanceof Error ? error : undefined);
      throw new AIServiceError("Failed to generate embedding");
    }
  },

  async generateResponse(prompt: string, apiKey?: string): Promise<string> {
    try {
      const result = await getChatModel(apiKey).generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error("Error generating response", error instanceof Error ? error : undefined);
      throw new AIServiceError("Failed to generate response");
    }
  },

  async extractFacts(text: string, apiKey?: string): Promise<string[]> {
    const prompt = `
    Analyze the following health tracker log entry.
    Extract distinct, atomic facts about the user's diet, nutrition, calorie intake, exercise, symptoms, sleep patterns, food sensitivities, hydration, or recurring health responses.
    Ignore generic statements. Focus on specific health-relevant cause-and-effect, tolerances, triggers, routines, and repeatable patterns.

    Log: "${text}"

    Output a JSON list of strings.
    Example: ["User feels bloated after dairy", "User tolerates almonds well", "User usually eats a high-protein breakfast", "User slept poorly after late caffeine"]
    `;

    try {
      const result = await getJsonModel(apiKey).generateContent(prompt);
      return JSON.parse(result.response.text()) as string[];
    } catch (error) {
      logger.error("Error extracting facts", error instanceof Error ? error : undefined);
      return [];
    }
  },

  async updateDailySummary(currentSummary: string | null, newLogEntry: string, apiKey?: string): Promise<string> {
    let prompt = "";

    if (!currentSummary) {
      prompt = `
      Summarize this health log entry into a coherent daily health narrative.
      Focus on meals, calories, exercise, symptoms, sleep, hydration, and overall wellbeing when present.
      Log: "${newLogEntry}"
      Summary:
      `;
    } else {
      prompt = `
      You are maintaining a daily health journal summary.

      Current Summary of the day:
      "${currentSummary}"

      New Health Event to add:
      "${newLogEntry}"

      Task: Rewrite the Daily Summary so it flows naturally while incorporating the new health event.
      Keep it concise but capture meals, calorie-related details, exercise, symptoms, sleep, hydration, and overall wellbeing when relevant.
      Updated Summary:
      `;
    }

    try {
      const result = await getChatModel(apiKey).generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error("Error generating summary", error instanceof Error ? error : undefined);
      throw new AIServiceError("Failed to update daily summary");
    }
  },

  async analyzeFood(imageBuffer: Buffer, mimeType: string, apiKey?: string): Promise<FoodAnalysisResult> {
    try {
      const result = await getJsonModel(apiKey).generateContent([
        FOOD_ANALYSIS_PROMPT,
        {
          inlineData: {
            mimeType,
            data: imageBuffer.toString("base64"),
          },
        },
      ]);

      return JSON.parse(result.response.text()) as FoodAnalysisResult;
    } catch (error) {
      logger.error("Error analyzing food image", error instanceof Error ? error : undefined);
      throw new AIServiceError("Failed to analyze food image");
    }
  },

  async transcribeAudio(audioBuffer: Buffer, mimeType: string, apiKey?: string): Promise<string> {
    try {
      const result = await getChatModel(apiKey).generateContent([
        AUDIO_TRANSCRIPTION_PROMPT,
        {
          inlineData: {
            mimeType,
            data: audioBuffer.toString("base64"),
          },
        },
      ]);

      return result.response.text().trim();
    } catch (error) {
      logger.error("Error transcribing audio", error instanceof Error ? error : undefined);
      throw new AIServiceError("Failed to transcribe audio");
    }
  },

  async generateVerifiedResponse(originalPrompt: string, contextData: string, apiKey?: string): Promise<string> {
    try {
      const model = getChatModel(apiKey);

      const draftResult = await model.generateContent(originalPrompt);
      const draftAnswer = draftResult.response.text();

      const critiquePrompt = `
      You are a strict Fact-Checking Editor.

      ### SOURCE DATA (The only truth):
      ${contextData}

      ### DRAFT ANSWER:
      ${draftAnswer}

      ### TASK:
      1. Verify if the Draft Answer contains any claims NOT supported by the Source Data.
      2. Verify if the tone is empathetic but objective.

      ### OUTPUT INSTRUCTIONS:
      - If the Draft Answer is accurate based *only* on the Source Data, respond with exactly: "VALID"
      - If the Draft Answer contains hallucinations or is rude, rewrite the answer completely to be accurate.
      `;

      const critiqueResult = await model.generateContent(critiquePrompt);
      const critiqueResponse = critiqueResult.response.text().trim();

      if (critiqueResponse.toUpperCase().includes("VALID")) {
        logger.info("[CoVe] Draft verified successfully.");
        return draftAnswer;
      } else {
        logger.warn("[CoVe] Hallucination detected. Returning corrected version.");
        return critiqueResponse;
      }

    } catch (error) {
      logger.error("Error in verification chain", error instanceof Error ? error : undefined);
      return this.generateResponse(originalPrompt, apiKey);
    }
  }
};
