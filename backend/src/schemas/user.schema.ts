import { z } from "zod";

export const userSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(6),
  profilePic: z.string().optional(),
});

export type UserInput = z.infer<typeof userSchema>;
