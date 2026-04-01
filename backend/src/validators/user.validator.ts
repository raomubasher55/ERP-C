import { z } from "zod";

export const userListQuerySchema = z.object({
  role: z.enum(["admin", "clinic", "patient"]).optional(),
  search: z.string().optional(),
});
