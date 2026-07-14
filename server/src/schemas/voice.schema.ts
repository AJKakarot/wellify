import { z } from "zod";

export const createVoiceLogSchema = z.object({
  durationSeconds: z.coerce.number().int().positive().max(60 * 30).optional(),
});

export const voiceLogIdParamSchema = z.object({
  id: z.string().trim().min(1, "Voice log id is required"),
});
