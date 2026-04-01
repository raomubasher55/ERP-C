import { Request, Response } from "express";
import { Types } from "mongoose";
import {
  createClinic,
  deleteClinic,
  getClinicById,
  listClinics,
  updateClinic,
} from "../services/clinic.service";
import {
  clinicCreateSchema,
  clinicIdParamSchema,
  clinicListQuerySchema,
  clinicUpdateSchema,
} from "../validators/clinic.validator";
import { formatZodError } from "../utils/validation.util";

export const createClinicHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = clinicCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const isAdmin = req.user.role === "admin";
    if (!isAdmin && parsed.data.ownerUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const ownerUserId = parsed.data.ownerUserId
      ? new Types.ObjectId(parsed.data.ownerUserId)
      : req.user._id;

    const { ownerUserId: _omit, ...payload } = parsed.data;

    const clinic = await createClinic(ownerUserId, payload);

    return res.status(201).json({ clinic: clinic.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const listClinicsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedQuery = clinicListQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedQuery.error),
      });
    }

    const isAdmin = req.user.role === "admin";
    const isPatient = req.user.role === "patient";
    if (!isAdmin && parsedQuery.data.ownerUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const ownerFilter = isAdmin ? null : isPatient ? null : req.user._id;
    const query = { ...parsedQuery.data };
    if (isPatient && query.isActive === undefined) {
      query.isActive = true;
    }

    const { clinics, total } = await listClinics(ownerFilter, query);

    return res.status(200).json({
      clinics: clinics.map((c) => c.toJSON()),
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit,
      total,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const getClinicHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedParams = clinicIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedParams.error),
      });
    }

    const isAdmin = req.user.role === "admin";
    const isPatient = req.user.role === "patient";
    const ownerFilter = isAdmin ? null : isPatient ? null : req.user._id;
    const clinic = await getClinicById(ownerFilter, parsedParams.data.id);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }
    if (isPatient && clinic.isActive === false) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    return res.status(200).json({ clinic: clinic.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const updateClinicHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedParams = clinicIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedParams.error),
      });
    }

    const parsedBody = clinicUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedBody.error),
      });
    }

    const isAdmin = req.user.role === "admin";
    if (!isAdmin && parsedBody.data.ownerUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const ownerFilter = isAdmin ? null : req.user._id;
    const updates: Record<string, unknown> = { ...parsedBody.data };
    if (updates.ownerUserId && isAdmin) {
      updates.ownerUserId = new Types.ObjectId(String(updates.ownerUserId));
    }

    const clinic = await updateClinic(
      ownerFilter,
      parsedParams.data.id,
      updates as typeof parsedBody.data
    );
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    return res.status(200).json({ clinic: clinic.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const deleteClinicHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedParams = clinicIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedParams.error),
      });
    }

    const ownerFilter = req.user.role === "admin" ? null : req.user._id;
    const clinic = await deleteClinic(ownerFilter, parsedParams.data.id);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    return res.status(200).json({ clinic: clinic.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};
