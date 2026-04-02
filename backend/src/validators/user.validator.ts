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
