import { z } from "zod";
import { Types } from "mongoose";

const numberFromString = (schema: z.ZodNumber) =>
  z.preprocess(
    (val) =>
      typeof val === "string" && val.trim() !== "" ? Number(val) : val,
    schema
  );

export const clinicIdParamSchema = z.object({
  id: z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid clinic id",
  }),
});

export const clinicCreateSchema = z.object({
  ownerUserId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: "Invalid ownerUserId" })
    .optional(),
  name: z.string().min(1, "name is required"),
  phone: z.string().min(1, "phone is required"),
  email: z.string().email("email must be valid").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  ownerName: z.string().optional(),
  subscriptionPlan: z.enum(["starter", "pro", "premium"]).optional(),
  workingDays: z.array(z.string()).optional(),
  startTime: z.string().min(1, "startTime is required"), 
  endTime: z.string().min(1, "endTime is required"),
  slotDuration: numberFromString(z.number().int().min(1)).optional(),
  breakTime: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  features: z
    .object({
      whatsappReminder: z.boolean().optional(),
      onlineBooking: z.boolean().optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

export const clinicUpdateSchema = clinicCreateSchema.partial();

export const clinicListQuerySchema = z.object({
  page: numberFromString(z.number().int().min(1)).default(1),
  limit: numberFromString(z.number().int().min(1).max(100)).default(20),
  search: z.string().optional(),
  city: z.string().optional(),
  isActive: z
    .preprocess((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return val;
    }, z.boolean())
    .optional(),
  ownerUserId: z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: "Invalid ownerUserId" })
    .optional(),
});
