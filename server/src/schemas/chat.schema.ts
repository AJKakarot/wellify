import { z } from "zod";

export const createChatSchema = z.object({
  message: z.string().trim().min(1, "Message is required"),
});

export type CreateChatSchema = z.infer<typeof createChatSchema>;
