import { ClinicDocument } from "../models/clinic.model";
import { AppointmentStatus } from "../models/appointment.model";

export type PublicAppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type TransitionActor = "patient" | "staff";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "scheduled",
  "completed",
];

export const normalizeAppointmentStatus = (
  status: AppointmentStatus
): PublicAppointmentStatus => (status === "scheduled" ? "confirmed" : status);

export const getActiveStatusFilter = (
  status: PublicAppointmentStatus | AppointmentStatus
): AppointmentStatus[] => {
  if (status === "confirmed" || status === "scheduled") {
    return ["confirmed", "scheduled"];
  }
  return [status as AppointmentStatus];
};

export const parseTimeToMinutes = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

export const validateClinicAvailability = (
  clinic: Pick<
    ClinicDocument,
    "isActive" | "workingDays" | "startTime" | "endTime" | "slotDuration" | "breakTime"
  >,
  scheduledAt: Date
) => {
  if (!clinic.isActive) {
    return "Clinic is not active.";
  }

  const dayLabel = DAY_LABELS[scheduledAt.getDay()];
  if (!clinic.workingDays.includes(dayLabel)) {
    return "Clinic is closed on the selected day.";
  }

  const appointmentMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
  const startMinutes = parseTimeToMinutes(clinic.startTime);
  const endMinutes = parseTimeToMinutes(clinic.endTime);
  const breakStartMinutes = parseTimeToMinutes(clinic.breakTime?.start);
  const breakEndMinutes = parseTimeToMinutes(clinic.breakTime?.end);
  const slotDuration = Math.max(clinic.slotDuration ?? 15, 1);

  if (startMinutes === null || endMinutes === null) {
    return "Clinic schedule is incomplete.";
  }

  if (appointmentMinutes < startMinutes || appointmentMinutes + slotDuration > endMinutes) {
    return "Appointment is outside clinic working hours.";
  }

  if ((appointmentMinutes - startMinutes) % slotDuration !== 0) {
    return "Appointment time must match the clinic slot duration.";
  }

  if (
    breakStartMinutes !== null &&
    breakEndMinutes !== null &&
    appointmentMinutes >= breakStartMinutes &&
    appointmentMinutes < breakEndMinutes
  ) {
    return "Appointment falls inside the clinic break time.";
  }

  return null;
};

export const canTransitionAppointment = (
  currentStatus: AppointmentStatus,
  nextStatus: AppointmentStatus,
  actor: TransitionActor
) => {
  const current = normalizeAppointmentStatus(currentStatus);
  const next = normalizeAppointmentStatus(nextStatus);

  if (current === next) return true;

  if (actor === "patient") {
    return (
      (current === "pending" || current === "confirmed") &&
      next === "cancelled"
    );
  }

  const allowedTransitions: Record<PublicAppointmentStatus, PublicAppointmentStatus[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled", "no_show"],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  return allowedTransitions[current].includes(next);
};

export const canRescheduleAppointment = (status: AppointmentStatus) => {
  const normalized = normalizeAppointmentStatus(status);
  return normalized === "pending" || normalized === "confirmed";
};
