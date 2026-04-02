import { Request, Response } from "express";
import { listUsers } from "../services/user.list.service";
import { getUserById, updateUserClinics, updateUserRole } from "../services/user.service";
import {
  userIdParamSchema,
  userListQuerySchema,
  userClinicsUpdateSchema,
  userRoleUpdateSchema,
} from "../validators/user.validator";
import { formatZodError } from "../utils/validation.util";

export const listUsersHandler = async (req: Request, res: Response) => {
  try {
    const parsed = userListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const users = await listUsers(parsed.data);
    return res.status(200).json({ users: users.map((u) => u.toJSON()) });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const updateUserRoleHandler = async (req: Request, res: Response) => {
  try {
    const parsedParams = userIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedParams.error),
      });
    }

    const parsedBody = userRoleUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedBody.error),
      });
    }

    const user = await updateUserRole(parsedParams.data.id, parsedBody.data.role);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (parsedBody.data.role !== "doctor" && parsedBody.data.role !== "receptionist") {
      if (user.clinicIds && user.clinicIds.length > 0) {
        const cleared = await updateUserClinics(parsedParams.data.id, []);
        if (cleared) {
          return res.status(200).json({ user: cleared.toJSON() });
        }
      }
    }

    return res.status(200).json({ user: user.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const updateUserClinicsHandler = async (req: Request, res: Response) => {
  try {
    const parsedParams = userIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedParams.error),
      });
    }

    const parsedBody = userClinicsUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedBody.error),
      });
    }

    const existing = await getUserById(parsedParams.data.id);
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    if (existing.role !== "doctor" && existing.role !== "receptionist") {
      return res
        .status(400)
        .json({ message: "Only doctor or receptionist can be assigned clinics" });
    }

    const user = await updateUserClinics(parsedParams.data.id, parsedBody.data.clinicIds);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: user.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};
