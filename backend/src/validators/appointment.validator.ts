import { z } from "zod";
import { Types } from "mongoose";

const numberFromString = (schema: z.ZodNumber) =>
  z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    schema
  );

export const appointmentIdParamSchema = z.object({
  id: z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid appointment id",
  }),
});

export const appointmentCreateSchema = z.object({
  clinicId: z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid clinicId",
  }),
  patientName: z.string().min(1, "patientName is required"),
  patientPhone: z.string().optional(),
  scheduledAt: z.string().datetime({ message: "scheduledAt must be ISO datetime" }),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  notes: z.string().optional(),
});

export const appointmentUpdateSchema = appointmentCreateSchema.partial();

export const appointmentListQuerySchema = z.object({
  page: numberFromString(z.number().int().min(1)).default(1),
  limit: numberFromString(z.number().int().min(1).max(100)).default(20),
  sortBy: z.enum(["scheduledAt", "createdAt", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  clinicId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: "Invalid clinicId" })
    .optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});
