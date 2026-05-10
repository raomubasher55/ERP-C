import type { AppointmentStatus } from "../types/api";

export const appointmentStatusOptions: { value: AppointmentStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
];

export const normalizeAppointmentStatus = (status: AppointmentStatus) =>
  status === "scheduled" ? "confirmed" : status;

export const formatAppointmentStatusLabel = (status: AppointmentStatus) =>
  normalizeAppointmentStatus(status).replace("_", " ");

export const getAppointmentStatusBadgeColor = (status: AppointmentStatus) => {
  const normalized = normalizeAppointmentStatus(status);
  if (normalized === "completed") return "green";
  if (normalized === "cancelled") return "red";
  if (normalized === "no_show") return "gray";
  if (normalized === "pending") return "amber";
  return "blue";
};

export const isPatientCancelableStatus = (status: AppointmentStatus) => {
  const normalized = normalizeAppointmentStatus(status);
  return normalized === "pending" || normalized === "confirmed";
};
