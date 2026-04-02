import { Request, Response } from "express";
import { Types } from "mongoose";
import Clinic from "../models/clinic.model";
import {
  appointmentCreateSchema,
  appointmentIdParamSchema,
  appointmentListQuerySchema,
  appointmentSlotsQuerySchema,
  appointmentUpdateSchema,
} from "../validators/appointment.validator";
import { formatZodError } from "../utils/validation.util";
import {
  countTodayAppointments,
  createAppointment,
  deleteAppointment,
  findClinicAppointmentConflict,
  getBookedSlotsForDate,
  getAppointmentById,
  listAppointments,
  refreshClinicAppointmentsToday,
  updateAppointment,
} from "../services/appointment.service";

const getOwnedClinicIds = async (userId: Types.ObjectId) => {
  const clinics = await Clinic.find({ ownerUserId: userId }).select("_id").exec();
  return clinics.map((c) => c._id);
};

const isAdminRole = (role?: string) => role === "admin";
const isPatientRole = (role?: string) => role === "patient";
const isClinicOwnerRole = (role?: string) => role === "clinic" || role === "clinic_owner";
const isClinicStaffRole = (role?: string) =>
  role === "doctor" || role === "receptionist";

const getAccessibleClinicIds = async (user: { role?: string; _id: Types.ObjectId; clinicIds?: Types.ObjectId[] }) => {
  if (isClinicOwnerRole(user.role)) {
    return getOwnedClinicIds(user._id);
  }
  if (isClinicStaffRole(user.role)) {
    return user.clinicIds ?? [];
  }
  return null;
};

export const createAppointmentHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = appointmentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    if (isPatientRole(req.user.role)) {
      const clinic = await Clinic.findById(parsed.data.clinicId).select("isActive").exec();
      if (!clinic || clinic.isActive === false) {
        return res.status(404).json({ message: "Clinic not found" });
      }
    }

    if (isClinicOwnerRole(req.user.role)) {
      const owned = await getOwnedClinicIds(req.user._id);
      const isOwned = owned.some((id) => id.equals(parsed.data.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => id.equals(parsed.data.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    }

    const scheduledAt = new Date(parsed.data.scheduledAt);
    const conflict = await findClinicAppointmentConflict(
      parsed.data.clinicId,
      scheduledAt
    );
    if (conflict) {
      return res
        .status(409)
        .json({ message: "This time is already booked for this clinic." });
    }

    const payload = {
      ...parsed.data,
      scheduledAt,
      updatedByUserId: req.user._id,
    };
    if (isPatientRole(req.user.role)) {
      delete payload.status;
    }

    const appointment = await createAppointment(req.user._id, payload);
    await refreshClinicAppointmentsToday(parsed.data.clinicId);

    return res.status(201).json({ appointment: appointment.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const listAppointmentsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = appointmentListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    let clinicIds: Types.ObjectId[] | null = null;
    if (isClinicOwnerRole(req.user.role)) {
      clinicIds = await getOwnedClinicIds(req.user._id);
      if (parsed.data.clinicId) {
        const isOwned = clinicIds.some((id) => id.equals(parsed.data.clinicId));
        if (!isOwned) return res.status(403).json({ message: "Forbidden" });
      }
    }
    if (isClinicStaffRole(req.user.role)) {
      clinicIds = req.user.clinicIds ?? [];
      if (parsed.data.clinicId) {
        const isAssigned = clinicIds.some((id) => id.equals(parsed.data.clinicId));
        if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
      }
    }

    const { appointments, total } = await listAppointments(clinicIds, {
      ...parsed.data,
      dateFrom: parsed.data.dateFrom ? new Date(parsed.data.dateFrom) : undefined,
      dateTo: parsed.data.dateTo ? new Date(parsed.data.dateTo) : undefined,
      createdByUserId: isPatientRole(req.user.role) ? req.user._id : undefined,
    });

    return res.status(200).json({
      appointments: appointments.map((a) => a.toJSON()),
      page: parsed.data.page,
      limit: parsed.data.limit,
      total,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const getAppointmentHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = appointmentIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const appointment = await getAppointmentById(parsed.data.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (isClinicOwnerRole(req.user.role)) {
      const owned = await getOwnedClinicIds(req.user._id);
      const isOwned = owned.some((id) => id.equals(appointment.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => id.equals(appointment.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isPatientRole(req.user.role)) {
      if (!appointment.createdByUserId.equals(req.user._id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    return res.status(200).json({ appointment: appointment.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const updateAppointmentHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsedParams = appointmentIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedParams.error),
      });
    }

    const parsedBody = appointmentUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedBody.error),
      });
    }

    const existing = await getAppointmentById(parsedParams.data.id);
    if (!existing) return res.status(404).json({ message: "Appointment not found" });

    if (isClinicOwnerRole(req.user.role)) {
      const owned = await getOwnedClinicIds(req.user._id);
      const isOwned = owned.some((id) => id.equals(existing.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
      if (parsedBody.data.clinicId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => id.equals(existing.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
      if (parsedBody.data.clinicId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }
    if (isPatientRole(req.user.role)) {
      if (!existing.createdByUserId.equals(req.user._id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const hasNonStatusUpdates = Object.entries(parsedBody.data).some(
        ([key, value]) => key !== "status" && value !== undefined
      );
      if (hasNonStatusUpdates || parsedBody.data.status !== "cancelled") {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (existing.status !== "scheduled") {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const updates = {
      ...parsedBody.data,
      scheduledAt: parsedBody.data.scheduledAt
        ? new Date(parsedBody.data.scheduledAt)
        : undefined,
      updatedByUserId: req.user._id,
    };

    const appointment = await updateAppointment(parsedParams.data.id, updates);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const newClinicId = updates.clinicId ? String(updates.clinicId) : String(existing.clinicId);
    const oldClinicId = String(existing.clinicId);
    await refreshClinicAppointmentsToday(oldClinicId);
    if (newClinicId !== oldClinicId) {
      await refreshClinicAppointmentsToday(newClinicId);
    }

    return res.status(200).json({ appointment: appointment.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const deleteAppointmentHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = appointmentIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const appointment = await getAppointmentById(parsed.data.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (isClinicOwnerRole(req.user.role)) {
      const owned = await getOwnedClinicIds(req.user._id);
      const isOwned = owned.some((id) => id.equals(appointment.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => id.equals(appointment.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isPatientRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const deleted = await deleteAppointment(parsed.data.id);
    if (!deleted) return res.status(404).json({ message: "Appointment not found" });
    await refreshClinicAppointmentsToday(appointment.clinicId);

    return res.status(200).json({ appointment: deleted.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const todayAppointmentsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const clinicIds = await getAccessibleClinicIds(req.user);

    const result = await countTodayAppointments(
      clinicIds,
      isPatientRole(req.user.role) ? req.user._id : undefined
    );
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const appointmentSlotsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = appointmentSlotsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    if (isClinicOwnerRole(req.user.role)) {
      const owned = await getOwnedClinicIds(req.user._id);
      const isOwned = owned.some((id) => id.equals(parsed.data.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => id.equals(parsed.data.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    }

    const slots = await getBookedSlotsForDate(parsed.data.clinicId, parsed.data.date);
    return res.status(200).json({ slots });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};
