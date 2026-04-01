import { Types } from "mongoose";
import Appointment, { AppointmentStatus } from "../models/appointment.model";
import Clinic from "../models/clinic.model";

export type AppointmentCreateInput = {
  clinicId: string;
  patientName: string;
  patientPhone?: string;
  scheduledAt: Date;
  status?: AppointmentStatus;
  notes?: string;
};

export type AppointmentUpdateInput = Partial<AppointmentCreateInput>;

export const createAppointment = (
  createdByUserId: Types.ObjectId,
  payload: AppointmentCreateInput
) =>
  Appointment.create({
    clinicId: new Types.ObjectId(payload.clinicId),
    createdByUserId,
    patientName: payload.patientName,
    patientPhone: payload.patientPhone,
    scheduledAt: payload.scheduledAt,
    status: payload.status ?? "scheduled",
    notes: payload.notes,
  });

export const findClinicAppointmentConflict = (clinicId: string, scheduledAt: Date) =>
  Appointment.findOne({
    clinicId: new Types.ObjectId(clinicId),
    scheduledAt,
    status: { $in: ["scheduled", "completed"] },
  }).exec();

export const listAppointments = async (
  clinicIds: Types.ObjectId[] | null,
  opts: {
    page: number;
    limit: number;
    clinicId?: string;
    status?: AppointmentStatus;
    dateFrom?: Date;
    dateTo?: Date;
    createdByUserId?: Types.ObjectId;
    sortBy?: "scheduledAt" | "createdAt" | "status";
    sortOrder?: "asc" | "desc";
  }
) => {
  const filter: Record<string, unknown> = {};

  if (opts.createdByUserId) {
    filter.createdByUserId = opts.createdByUserId;
  }

  if (clinicIds) {
    filter.clinicId = { $in: clinicIds };
  }

  if (opts.clinicId) {
    filter.clinicId = new Types.ObjectId(opts.clinicId);
  }

  if (opts.status) {
    filter.status = opts.status;
  }

  if (opts.dateFrom || opts.dateTo) {
    filter.scheduledAt = {};
    if (opts.dateFrom) {
      (filter.scheduledAt as Record<string, Date>).$gte = opts.dateFrom;
    }
    if (opts.dateTo) {
      (filter.scheduledAt as Record<string, Date>).$lte = opts.dateTo;
    }
  }

  const skip = (opts.page - 1) * opts.limit;
  const sortKey = opts.sortBy ?? "scheduledAt";
  const sortOrder = opts.sortOrder === "asc" ? 1 : -1;
  const sort: Record<string, number> = { [sortKey]: sortOrder };
  const [appointments, total] = await Promise.all([
    Appointment.find(filter).sort(sort).skip(skip).limit(opts.limit).exec(),
    Appointment.countDocuments(filter).exec(),
  ]);

  return { appointments, total };
};

export const getAppointmentById = (id: string) => Appointment.findById(id).exec();

export const updateAppointment = (id: string, updates: AppointmentUpdateInput) =>
  Appointment.findByIdAndUpdate(
    id,
    {
      ...updates,
      clinicId: updates.clinicId ? new Types.ObjectId(updates.clinicId) : undefined,
      scheduledAt: updates.scheduledAt ?? undefined,
    },
    { new: true, runValidators: true }
  ).exec();

export const deleteAppointment = (id: string) => Appointment.findByIdAndDelete(id).exec();

export const countTodayAppointments = async (
  clinicIds: Types.ObjectId[] | null,
  createdByUserId?: Types.ObjectId
) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const filter: Record<string, unknown> = {
    scheduledAt: { $gte: start, $lte: end },
    status: { $in: ["scheduled", "completed"] },
  };
  if (clinicIds) {
    filter.clinicId = { $in: clinicIds };
  }
  if (createdByUserId) {
    filter.createdByUserId = createdByUserId;
  }

  const total = await Appointment.countDocuments(filter).exec();
  return { total, start, end };
};

export const refreshClinicAppointmentsToday = async (clinicId: Types.ObjectId | string) => {
  const id = typeof clinicId === "string" ? new Types.ObjectId(clinicId) : clinicId;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const total = await Appointment.countDocuments({
    clinicId: id,
    scheduledAt: { $gte: start, $lte: end },
    status: { $in: ["scheduled", "completed"] },
  }).exec();

  await Clinic.findByIdAndUpdate(id, { appointments: total }).exec();
  return total;
};
