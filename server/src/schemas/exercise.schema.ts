import { z } from "zod";

export const createExerciseLogSchema = z.object({
  activityType: z.string().trim().min(1).max(120),
  durationMinutes: z.number().int().positive().max(24 * 60),
  estimatedCaloriesBurned: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().trim().max(500).optional(),
  loggedAt: z.coerce.date().optional(),
});

export const exerciseLogIdParamSchema = z.object({
  id: z.string().trim().min(1, "Exercise log id is required"),
});
