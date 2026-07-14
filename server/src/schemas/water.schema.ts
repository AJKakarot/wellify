import { z } from "zod";

export const createWaterLogSchema = z.object({
  amountMl: z.number().int().positive().max(10000),
  loggedAt: z.coerce.date().optional(),
});

export const waterLogIdParamSchema = z.object({
  id: z.string().trim().min(1, "Water log id is required"),
});
