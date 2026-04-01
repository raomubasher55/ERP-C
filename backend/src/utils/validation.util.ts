import { ZodError } from "zod";

export const formatZodError = (error: ZodError) =>
  error.errors.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
