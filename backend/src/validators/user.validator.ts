import { z } from "zod";
import { Types } from "mongoose";

export const userListQuerySchema = z.object({
  role: z.enum(["admin", "clinic_owner", "doctor", "receptionist", "patient", "clinic"]).optional(),
  search: z.string().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid user id",
  }),
});

export const userRoleUpdateSchema = z.object({
  role: z.enum(["admin", "clinic_owner", "doctor", "receptionist", "patient"]),
});

export const userClinicsUpdateSchema = z.object({
  clinicIds: z
    .array(
      z.string().refine((val) => Types.ObjectId.isValid(val), {
        message: "Invalid clinic id",
      })
    )
    .default([]),
});

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).optional();

export const patientProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    patientProfile: z
      .object({
        dateOfBirth: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "dateOfBirth must be YYYY-MM-DD" })
          .optional(),
        gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
      })
      .optional(),
    contact: z
      .object({
        phone: optionalTrimmedString(30),
        address: optionalTrimmedString(250),
        city: optionalTrimmedString(120),
        emergencyContact: z
          .object({
            name: optionalTrimmedString(120),
            phone: optionalTrimmedString(30),
            relation: optionalTrimmedString(80),
          })
          .optional(),
      })
      .optional(),
    consent: z
      .object({
        treatment: z.boolean(),
        dataProcessing: z.boolean(),
        marketing: z.boolean().default(false),
        smsReminders: z.boolean().default(false),
      })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
