export type User = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "clinic" | "patient";
  createdAt: string;
  updatedAt: string;
};

export type Clinic = {
  _id: string;
  ownerUserId: string;
  appointments: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  ownerName?: string;
  subscriptionPlan: "starter" | "pro" | "premium";
  workingDays: string[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  breakTime?: { start?: string; end?: string };
  features?: { whatsappReminder?: boolean; onlineBooking?: boolean };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClinicCreatePayload = {
  ownerUserId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  ownerName?: string;
  subscriptionPlan?: "starter" | "pro" | "premium";
  workingDays?: string[];
  startTime: string;
  endTime: string;
  slotDuration?: number;
  breakTime?: { start?: string; end?: string };
  features?: { whatsappReminder?: boolean; onlineBooking?: boolean };
  isActive?: boolean;
};

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export type Appointment = {
  _id: string;
  clinicId: string;
  createdByUserId: string;
  patientName: string;
  patientPhone?: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentCreatePayload = {
  clinicId: string;
  patientName: string;
  patientPhone?: string;
  scheduledAt: string;
  notes?: string;
};

export type AppointmentUpdatePayload = Partial<{
  clinicId: string;
  patientName: string;
  patientPhone?: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes?: string;
}>;
