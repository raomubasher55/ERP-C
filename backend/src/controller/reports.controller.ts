import { Request, Response } from "express";
import { Types } from "mongoose";
import Clinic from "../models/clinic.model";
import { formatZodError } from "../utils/validation.util";
import { getReportsOverview } from "../services/reports.service";
import { reportsOverviewQuerySchema } from "../validators/reports.validator";

const isClinicOwnerRole = (role?: string) => role === "clinic" || role === "clinic_owner";
const isClinicStaffRole = (role?: string) => role === "doctor" || role === "receptionist";
const objectIdEquals = (
  left: Types.ObjectId | string | null | undefined,
  right: Types.ObjectId | string | null | undefined
) => String(left) === String(right);

const getOwnedClinicIds = async (userId: Types.ObjectId) => {
  const clinics = await Clinic.find({ ownerUserId: userId, deletedAt: null }).select("_id").exec();
  return clinics.map((clinic) => clinic._id);
};

const getAccessibleClinicIds = async (user: {
  role?: string;
  _id: Types.ObjectId;
  clinicIds?: Types.ObjectId[];
}) => {
  if (user.role === "admin") return null;
  if (isClinicOwnerRole(user.role)) {
    return getOwnedClinicIds(user._id);
  }
  if (isClinicStaffRole(user.role)) {
    return user.clinicIds ?? [];
  }
  return [];
};

export const reportsOverviewHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = reportsOverviewQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const clinicIds = await getAccessibleClinicIds(req.user);
    if (parsed.data.clinicId && clinicIds) {
      const hasAccess = clinicIds.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const overview = await getReportsOverview({
      clinicIds,
      clinicId: parsed.data.clinicId,
      preset: parsed.data.preset,
      dateFrom: parsed.data.dateFrom,
      dateTo: parsed.data.dateTo,
    });

    return res.status(200).json(overview);
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};
