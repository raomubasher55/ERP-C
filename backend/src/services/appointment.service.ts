import { Types } from "mongoose";
import Appointment, {
  AppointmentPrescription,
  AppointmentStatus,
} from "../models/appointment.model";
import Clinic from "../models/clinic.model";
import { ACTIVE_APPOINTMENT_STATUSES, getActiveStatusFilter } from "../utils/appointment.util";

const APPOINTMENT_SLOT_CACHE_TTL_MS = 60_000;
const appointmentSlotCache = new Map<string, { cachedAt: number; slots: string[] }>();

const getDateKey = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
};

const getAppointmentSlotCacheKey = (clinicId: string | Types.ObjectId, date: Date | string) =>
  `${String(clinicId)}:${getDateKey(date)}`;

export const invalidateAppointmentSlotCache = (
  clinicId: string | Types.ObjectId,
  date: Date | string
) => {
  appointmentSlotCache.delete(getAppointmentSlotCacheKey(clinicId, date));
};

export type AppointmentCreateInput = {
  clinicId: string;
  patientName: string;
  patientPhone?: string;
  scheduledAt: Date;
  status?: AppointmentStatus;
  notes?: string;
  prescriptions?: AppointmentPrescription[];
  updatedByUserId?: Types.ObjectId;
};

export type AppointmentUpdateInput = Partial<AppointmentCreateInput>;

export const createAppointment = async (
  createdByUserId: Types.ObjectId,
  payload: AppointmentCreateInput
) => {
  const appointment = await Appointment.create({
    clinicId: new Types.ObjectId(payload.clinicId),
    createdByUserId,
    updatedByUserId: payload.updatedByUserId ?? createdByUserId,
    patientName: payload.patientName,
    patientPhone: payload.patientPhone,
    scheduledAt: payload.scheduledAt,
    status: payload.status ?? "pending",
    notes: payload.notes,
    prescriptions: payload.prescriptions ?? [],
  });
  invalidateAppointmentSlotCache(payload.clinicId, payload.scheduledAt);
  return appointment;
};

export const findClinicAppointmentConflict = (
  clinicId: string,
  scheduledAt: Date,
  excludeAppointmentId?: string
) =>
  Appointment.findOne({
    clinicId: new Types.ObjectId(clinicId),
    scheduledAt,
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    ...(excludeAppointmentId ? { _id: { $ne: new Types.ObjectId(excludeAppointmentId) } } : {}),
    deletedAt: null,
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
    const statuses = getActiveStatusFilter(opts.status);
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
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
  filter.deletedAt = null;

  const skip = (opts.page - 1) * opts.limit;
  const sortKey = opts.sortBy ?? "scheduledAt";
  const sortOrder = opts.sortOrder === "asc" ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [sortKey]: sortOrder };
  const [appointments, total] = await Promise.all([
    Appointment.find(filter).sort(sort).skip(skip).limit(opts.limit).exec(),
    Appointment.countDocuments(filter).exec(),
  ]);

  return { appointments, total };
};

export const getAppointmentById = (id: string) =>
  Appointment.findOne({ _id: id, deletedAt: null }).exec();

export const updateAppointment = async (id: string, updates: AppointmentUpdateInput) => {
  const existing = await Appointment.findOne({ _id: id, deletedAt: null }).exec();
  if (!existing) return null;

  const appointment = await Appointment.findOneAndUpdate(
    { _id: id, deletedAt: null },
    {
      ...updates,
      clinicId: updates.clinicId ? new Types.ObjectId(updates.clinicId) : undefined,
      scheduledAt: updates.scheduledAt ?? undefined,
    },
    { new: true, runValidators: true }
  ).exec();

  if (!appointment) return null;

  invalidateAppointmentSlotCache(existing.clinicId, existing.scheduledAt);
  invalidateAppointmentSlotCache(appointment.clinicId, appointment.scheduledAt);

  return appointment;
};

export const deleteAppointment = async (id: string) => {
  const existing = await Appointment.findOne({ _id: id, deletedAt: null }).exec();
  if (!existing) return null;

  const appointment = await Appointment.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  ).exec();

  if (!appointment) return null;

  invalidateAppointmentSlotCache(existing.clinicId, existing.scheduledAt);
  return appointment;
};

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
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    deletedAt: null,
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
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    deletedAt: null,
  }).exec();

  await Clinic.findByIdAndUpdate(id, { appointments: total }).exec();
  return total;
};

export const getBookedSlotsForDate = async (clinicId: string, date: string) => {
  const cacheKey = getAppointmentSlotCacheKey(clinicId, date);
  const cached = appointmentSlotCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < APPOINTMENT_SLOT_CACHE_TTL_MS) {
    return cached.slots;
  }

  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  const appointments = await Appointment.find({
    clinicId: new Types.ObjectId(clinicId),
    scheduledAt: { $gte: start, $lte: end },
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    deletedAt: null,
  })
    .select("scheduledAt")
    .exec();

  const slots = appointments.map((a) => a.scheduledAt.toISOString());
  appointmentSlotCache.set(cacheKey, { cachedAt: Date.now(), slots });
  return slots;
};
