import { z } from "zod";

export const createWeightLogSchema = z.object({
  weightKg: z.number().positive().max(500),
  notes: z.string().trim().max(500).optional(),
  loggedAt: z.coerce.date().optional(),
});

export const weightLogIdParamSchema = z.object({
  id: z.string().trim().min(1, "Weight log id is required"),
});
