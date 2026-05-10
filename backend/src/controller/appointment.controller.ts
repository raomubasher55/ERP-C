import { Request, Response } from "express";
import { Types } from "mongoose";
import Clinic from "../models/clinic.model";
import {
  appointmentCreateSchema,
  appointmentIdParamSchema,
  appointmentListQuerySchema,
  appointmentPrescriptionUpdateSchema,
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
import {
  canRescheduleAppointment,
  canTransitionAppointment,
  normalizeAppointmentStatus,
  validateClinicAvailability,
} from "../utils/appointment.util";

const getOwnedClinicIds = async (userId: Types.ObjectId) => {
  const clinics = await Clinic.find({ ownerUserId: userId }).select("_id").exec();
  return clinics.map((c) => c._id);
};

const toAppointmentResponse = (appointment: { toJSON: () => Record<string, unknown> }) => {
  const data = appointment.toJSON();
  return {
    ...data,
    status: normalizeAppointmentStatus(data.status as never),
  };
};

const isPatientRole = (role?: string) => role === "patient";
const isClinicOwnerRole = (role?: string) => role === "clinic" || role === "clinic_owner";
const isClinicStaffRole = (role?: string) =>
  role === "doctor" || role === "receptionist";

const objectIdEquals = (
  left: Types.ObjectId | string | null | undefined,
  right: Types.ObjectId | string | null | undefined
) => String(left) === String(right);

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

    const clinic = await Clinic.findById(parsed.data.clinicId).exec();
    if (!clinic || clinic.isActive === false) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    if (isClinicOwnerRole(req.user.role)) {
      const owned = await getOwnedClinicIds(req.user._id);
      const isOwned = owned.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    }

    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ message: "Invalid appointment datetime." });
    }
    if (scheduledAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Appointment time cannot be in the past." });
    }

    const availabilityError = validateClinicAvailability(clinic, scheduledAt);
    if (availabilityError) {
      return res.status(400).json({ message: availabilityError });
    }

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
      status: isPatientRole(req.user.role) ? "pending" : parsed.data.status ?? "confirmed",
      updatedByUserId: req.user._id,
    };

    const appointment = await createAppointment(req.user._id, payload);
    await refreshClinicAppointmentsToday(parsed.data.clinicId);

    return res.status(201).json({ appointment: toAppointmentResponse(appointment) });
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
        const isOwned = clinicIds.some((id) => objectIdEquals(id, parsed.data.clinicId));
        if (!isOwned) return res.status(403).json({ message: "Forbidden" });
      }
    }
    if (isClinicStaffRole(req.user.role)) {
      clinicIds = req.user.clinicIds ?? [];
      if (parsed.data.clinicId) {
        const isAssigned = clinicIds.some((id) => objectIdEquals(id, parsed.data.clinicId));
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
      appointments: appointments.map((a) => toAppointmentResponse(a)),
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
      const isOwned = owned.some((id) => objectIdEquals(id, appointment.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => objectIdEquals(id, appointment.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isPatientRole(req.user.role)) {
      if (!objectIdEquals(appointment.createdByUserId, req.user._id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    return res.status(200).json({ appointment: toAppointmentResponse(appointment) });
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
      const isOwned = owned.some((id) => objectIdEquals(id, existing.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
      if (parsedBody.data.clinicId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => objectIdEquals(id, existing.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
      if (parsedBody.data.clinicId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }
    if (isPatientRole(req.user.role)) {
      if (!objectIdEquals(existing.createdByUserId, req.user._id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const hasNonStatusUpdates = Object.entries(parsedBody.data).some(
        ([key, value]) => key !== "status" && value !== undefined
      );
      if (hasNonStatusUpdates || parsedBody.data.status !== "cancelled") {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (!canTransitionAppointment(existing.status, "cancelled", "patient")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (new Date(existing.scheduledAt).getTime() < Date.now()) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    if (!isPatientRole(req.user.role) && parsedBody.data.status) {
      if (!canTransitionAppointment(existing.status, parsedBody.data.status, "staff")) {
        return res.status(400).json({ message: "Invalid status transition." });
      }
    }

    const targetClinicId = parsedBody.data.clinicId
      ? String(parsedBody.data.clinicId)
      : String(existing.clinicId);
    const targetScheduledAt = parsedBody.data.scheduledAt
      ? new Date(parsedBody.data.scheduledAt)
      : existing.scheduledAt;
    const hasClinicChange =
      parsedBody.data.clinicId !== undefined &&
      String(existing.clinicId) !== targetClinicId;
    const hasTimeChange =
      parsedBody.data.scheduledAt !== undefined &&
      new Date(existing.scheduledAt).getTime() !== targetScheduledAt.getTime();
    const needsSchedulingValidation = hasClinicChange || hasTimeChange;

    if (needsSchedulingValidation) {
      if (Number.isNaN(targetScheduledAt.getTime())) {
        return res.status(400).json({ message: "Invalid appointment datetime." });
      }
      if (targetScheduledAt.getTime() < Date.now()) {
        return res.status(400).json({ message: "Appointment time cannot be in the past." });
      }
      if (!canRescheduleAppointment(existing.status)) {
        return res.status(400).json({ message: "This appointment cannot be rescheduled." });
      }

      const targetClinic = await Clinic.findById(targetClinicId).exec();
      if (!targetClinic || targetClinic.isActive === false) {
        return res.status(404).json({ message: "Clinic not found" });
      }

      const availabilityError = validateClinicAvailability(targetClinic, targetScheduledAt);
      if (availabilityError) {
        return res.status(400).json({ message: availabilityError });
      }

      const conflict = await findClinicAppointmentConflict(
        targetClinicId,
        targetScheduledAt,
        parsedParams.data.id
      );
      if (conflict) {
        return res
          .status(409)
          .json({ message: "This time is already booked for this clinic." });
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

    return res.status(200).json({ appointment: toAppointmentResponse(appointment) });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const updateAppointmentPrescriptionsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (isPatientRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsedParams = appointmentIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsedParams.error),
      });
    }

    const parsedBody = appointmentPrescriptionUpdateSchema.safeParse(req.body);
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
      const isOwned = owned.some((id) => objectIdEquals(id, existing.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => objectIdEquals(id, existing.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    }

    const appointment = await updateAppointment(parsedParams.data.id, {
      prescriptions: parsedBody.data.prescriptions,
      updatedByUserId: req.user._id,
    });

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    return res.status(200).json({ appointment: toAppointmentResponse(appointment) });
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
      const isOwned = owned.some((id) => objectIdEquals(id, appointment.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => objectIdEquals(id, appointment.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isPatientRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const deleted = await deleteAppointment(parsed.data.id);
    if (!deleted) return res.status(404).json({ message: "Appointment not found" });
    await refreshClinicAppointmentsToday(appointment.clinicId);

    return res.status(200).json({ appointment: toAppointmentResponse(deleted) });
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
      const isOwned = owned.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!isOwned) return res.status(403).json({ message: "Forbidden" });
    }
    if (isClinicStaffRole(req.user.role)) {
      const assigned = req.user.clinicIds ?? [];
      const isAssigned = assigned.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    }

    const slots = await getBookedSlotsForDate(parsed.data.clinicId, parsed.data.date);
    return res.status(200).json({ slots });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};
