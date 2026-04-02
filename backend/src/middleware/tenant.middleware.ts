import { Request, Response, NextFunction } from "express";
import Clinic from "../models/clinic.model";

type ClinicSource = "body" | "query" | "params";

export const requireClinicOwnership =
  (source: ClinicSource, key = "clinicId") =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role === "admin" || req.user.role === "patient") {
      return next();
    }
    const container = req[source] as Record<string, unknown> | undefined;
    const clinicId = container?.[key];
    if (!clinicId || typeof clinicId !== "string") {
      return next();
    }

    if (req.user.role === "clinic" || req.user.role === "clinic_owner") {
      const owned = await Clinic.findOne({
        _id: clinicId,
        ownerUserId: req.user._id,
        deletedAt: null,
      })
        .select("_id")
        .exec();

      if (!owned) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    if (req.user.role === "doctor" || req.user.role === "receptionist") {
      const assigned = req.user.clinicIds ?? [];
      const hasAccess = assigned.some((id) => String(id) === String(clinicId));
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    return next();
  };
