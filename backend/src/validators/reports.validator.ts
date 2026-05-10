import { Types } from "mongoose";
import { z } from "zod";

export const reportPresetSchema = z.enum(["today", "7d", "30d"]);

export const reportsOverviewQuerySchema = z
  .object({
    clinicId: z
      .string()
      .refine((val) => Types.ObjectId.isValid(val), { message: "Invalid clinicId" })
      .optional(),
    preset: reportPresetSchema.optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.dateFrom && !value.dateTo) || (!value.dateFrom && value.dateTo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateFrom"],
        message: "dateFrom and dateTo must be provided together",
      });
    }

    if (value.dateFrom && value.dateTo) {
      const start = new Date(value.dateFrom);
      const end = new Date(value.dateTo);
      if (start.getTime() > end.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dateFrom"],
          message: "dateFrom must be earlier than or equal to dateTo",
        });
      }
    }
  });
