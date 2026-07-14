import { z } from "zod";

export const createLogSchema = z.object({
  content: z.string().trim().min(1, "Content is required"),
});

export type CreateLogSchema = z.infer<typeof createLogSchema>;
