import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "name is required"),
  email: z.string().email("email must be valid"),
  password: z.string().min(1, "password is required"),
});

export const loginSchema = z.object({
  email: z.string().email("email must be valid"),
  password: z.string().min(1, "password is required"),
});
