import { Request, Response } from "express";
import { listUsers } from "../services/user.list.service";
import {
  getUserById,
  updateUserClinics,
  updateUserProfile,
  updateUserRole,
} from "../services/user.service";
import {
  patientProfileUpdateSchema,
  userIdParamSchema,
  userListQuerySchema,
  userClinicsUpdateSchema,
  userRoleUpdateSchema,
} from "../validators/user.validator";
import { formatZodError } from "../utils/validation.util";

export const getMyProfileHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json({ user: req.user.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const updateMyProfileHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = patientProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const updates: Record<string, unknown> = {
      updatedByUserId: req.user._id,
    };

    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name;
    }

    if (parsed.data.patientProfile?.dateOfBirth !== undefined) {
      updates["patientProfile.dateOfBirth"] = new Date(
        `${parsed.data.patientProfile.dateOfBirth}T00:00:00.000Z`
      );
    }
    if (parsed.data.patientProfile?.gender !== undefined) {
      updates["patientProfile.gender"] = parsed.data.patientProfile.gender;
    }

    if (parsed.data.contact?.phone !== undefined) {
      updates["contact.phone"] = parsed.data.contact.phone;
    }
    if (parsed.data.contact?.address !== undefined) {
      updates["contact.address"] = parsed.data.contact.address;
    }
    if (parsed.data.contact?.city !== undefined) {
      updates["contact.city"] = parsed.data.contact.city;
    }
    if (parsed.data.contact?.emergencyContact?.name !== undefined) {
      updates["contact.emergencyContact.name"] = parsed.data.contact.emergencyContact.name;
    }
    if (parsed.data.contact?.emergencyContact?.phone !== undefined) {
      updates["contact.emergencyContact.phone"] = parsed.data.contact.emergencyContact.phone;
    }
    if (parsed.data.contact?.emergencyContact?.relation !== undefined) {
      updates["contact.emergencyContact.relation"] = parsed.data.contact.emergencyContact.relation;
    }

    if (parsed.data.consent) {
      updates["consent.treatment"] = parsed.data.consent.treatment;
      updates["consent.dataProcessing"] = parsed.data.consent.dataProcessing;
      updates["consent.marketing"] = parsed.data.consent.marketing;
      updates["consent.smsReminders"] = parsed.data.consent.smsReminders;
      updates["consent.updatedAt"] = new Date();
    }

    const user = await updateUserProfile(req.user._id, updates);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: user.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

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
