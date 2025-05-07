import { z } from "zod";

export const messageSchema = z.object({
  text: z.string().optional(), // text can be optional
  image: z.string().optional(), // image can be optional
});

export type MessageInput = z.infer<typeof messageSchema>; // Extract the type from the schema
