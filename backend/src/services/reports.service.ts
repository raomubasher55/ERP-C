import { Types } from "mongoose";
import Appointment from "../models/appointment.model";
import Clinic, { ClinicDocument } from "../models/clinic.model";
import Invoice from "../models/invoice.model";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  normalizeAppointmentStatus,
  parseTimeToMinutes,
} from "../utils/appointment.util";

export type ReportPreset = "today" | "7d" | "30d";

export type ReportsOverviewInput = {
  clinicIds?: Types.ObjectId[] | null;
  clinicId?: string;
  preset?: ReportPreset;
  dateFrom?: string;
  dateTo?: string;
};

export type ReportTopDispensedMedicine = {
  inventoryItemId: string;
  name: string;
  quantityTotal: number;
  revenueTotal: number;
};

type DateRange = {
  start: Date;
  end: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

const getDateRange = (input: ReportsOverviewInput): DateRange => {
  if (input.dateFrom && input.dateTo) {
    return {
      start: new Date(input.dateFrom),
      end: new Date(input.dateTo),
    };
  }

  const now = new Date();
  if (input.preset === "today") {
    return {
      start: startOfDay(now),
      end: endOfDay(now),
    };
  }

  const days = input.preset === "30d" ? 30 : 7;
  const end = endOfDay(now);
  const start = startOfDay(new Date(end.getTime() - (days - 1) * DAY_MS));
  return { start, end };
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const buildSeriesBuckets = (start: Date, end: Date) => {
  const buckets: string[] = [];
  const cursor = startOfDay(start);
  const finalDay = startOfDay(end);

  while (cursor.getTime() <= finalDay.getTime()) {
    buckets.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
};

const getSlotsPerDay = (clinic: Pick<ClinicDocument, "startTime" | "endTime" | "slotDuration" | "breakTime">) => {
  const startMinutes = parseTimeToMinutes(clinic.startTime);
  const endMinutes = parseTimeToMinutes(clinic.endTime);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return 0;
  }

  const duration = Math.max(clinic.slotDuration ?? 15, 1);
  const breakStart = parseTimeToMinutes(clinic.breakTime?.start);
  const breakEnd = parseTimeToMinutes(clinic.breakTime?.end);

  let total = 0;
  for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += duration) {
    const inBreak =
      breakStart !== null &&
      breakEnd !== null &&
      minutes >= breakStart &&
      minutes < breakEnd;

    if (!inBreak) {
      total += 1;
    }
  }

  return total;
};

const countAvailableSlots = (clinic: ClinicDocument, start: Date, end: Date) => {
  const workingDays = new Set(clinic.workingDays);
  const slotsPerDay = getSlotsPerDay(clinic);
  if (slotsPerDay === 0 || workingDays.size === 0) {
    return 0;
  }

  let total = 0;
  const cursor = startOfDay(start);
  const finalDay = startOfDay(end);

  while (cursor.getTime() <= finalDay.getTime()) {
    const dayLabel = DAY_LABELS[cursor.getDay()];
    if (workingDays.has(dayLabel)) {
      total += slotsPerDay;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
};

export const getAccessibleReportsClinics = async (
  clinicIds?: Types.ObjectId[] | null,
  clinicId?: string
) => {
  const filter: Record<string, unknown> = { deletedAt: null };

  if (clinicIds) {
    filter._id = { $in: clinicIds };
  }

  if (clinicId) {
    filter._id = new Types.ObjectId(clinicId);
  }

  return Clinic.find(filter).sort({ name: 1 }).exec();
};

export const getReportsOverview = async (input: ReportsOverviewInput) => {
  const { start, end } = getDateRange(input);
  const clinics = await getAccessibleReportsClinics(input.clinicIds, input.clinicId);
  const clinicIdStrings = clinics.map((clinic) => String(clinic._id));
  const clinicObjectIds = clinics.map((clinic) => clinic._id);

  const [appointments, invoices] = await Promise.all([
    Appointment.find({
      clinicId: { $in: clinicObjectIds },
      scheduledAt: { $gte: start, $lte: end },
      deletedAt: null,
    }).exec(),
    Invoice.find({
      clinicId: { $in: clinicObjectIds },
      issuedAt: { $gte: start, $lte: end },
      deletedAt: null,
    }).exec(),
  ]);

  const appointmentStatusBreakdown = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };

  const revenueByDay = new Map<string, number>();
  const appointmentsByDay = new Map<string, number>();
  const dispensedMedicineByItem = new Map<
    string,
    { inventoryItemId: string; name: string; quantityTotal: number; revenueTotal: number }
  >();
  const performanceByClinic = new Map<
    string,
    {
      clinicId: string;
      clinicName: string;
      revenueTotal: number;
      appointmentsTotal: number;
      cancelledAppointments: number;
      occupiedSlots: number;
      availableSlots: number;
    }
  >();

  clinics.forEach((clinic) => {
    performanceByClinic.set(String(clinic._id), {
      clinicId: String(clinic._id),
      clinicName: clinic.name,
      revenueTotal: 0,
      appointmentsTotal: 0,
      cancelledAppointments: 0,
      occupiedSlots: 0,
      availableSlots: countAvailableSlots(clinic, start, end),
    });
  });

  appointments.forEach((appointment) => {
    const normalized = normalizeAppointmentStatus(appointment.status);
    appointmentStatusBreakdown[normalized] += 1;

    const clinicStats = performanceByClinic.get(String(appointment.clinicId));
    if (clinicStats) {
      clinicStats.appointmentsTotal += 1;
      if (normalized === "cancelled") {
        clinicStats.cancelledAppointments += 1;
      }
      if (ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
        clinicStats.occupiedSlots += 1;
      }
    }

    const dayKey = appointment.scheduledAt.toISOString().slice(0, 10);
    appointmentsByDay.set(dayKey, (appointmentsByDay.get(dayKey) ?? 0) + 1);
  });

  invoices.forEach((invoice) => {
    const clinicStats = performanceByClinic.get(String(invoice.clinicId));
    if (clinicStats) {
      clinicStats.revenueTotal += invoice.total;
    }

    const dayKey = invoice.issuedAt.toISOString().slice(0, 10);
    revenueByDay.set(dayKey, Number(((revenueByDay.get(dayKey) ?? 0) + invoice.total).toFixed(2)));

    invoice.items.forEach((item) => {
      if (
        item.type !== "dispensed_medicine" ||
        item.dispenseStatus !== "dispensed" ||
        !item.inventoryItemId
      ) {
        return;
      }

      const key = String(item.inventoryItemId);
      const existing = dispensedMedicineByItem.get(key);
      if (existing) {
        existing.quantityTotal += item.quantity;
        existing.revenueTotal = Number((existing.revenueTotal + item.lineTotal).toFixed(2));
        return;
      }

      dispensedMedicineByItem.set(key, {
        inventoryItemId: key,
        name: item.displayName,
        quantityTotal: item.quantity,
        revenueTotal: item.lineTotal,
      });
    });
  });

  const bucketKeys = buildSeriesBuckets(start, end);
  const revenueSeries = bucketKeys.map((date) => ({
    date,
    value: Number((revenueByDay.get(date) ?? 0).toFixed(2)),
  }));
  const appointmentSeries = bucketKeys.map((date) => ({
    date,
    value: appointmentsByDay.get(date) ?? 0,
  }));

  const appointmentsTotal = appointments.length;
  const revenueTotal = Number(
    invoices.reduce((sum, invoice) => sum + invoice.total, 0).toFixed(2)
  );
  const occupiedSlots = Array.from(performanceByClinic.values()).reduce(
    (sum, clinic) => sum + clinic.occupiedSlots,
    0
  );
  const availableSlots = Array.from(performanceByClinic.values()).reduce(
    (sum, clinic) => sum + clinic.availableSlots,
    0
  );
  const cancelledAppointments = appointmentStatusBreakdown.cancelled;
  const dispensedMedicineRows = Array.from(dispensedMedicineByItem.values());
  const topDispensedMedicines = dispensedMedicineRows
    .sort((left, right) => {
      if (right.quantityTotal !== left.quantityTotal) {
        return right.quantityTotal - left.quantityTotal;
      }
      return right.revenueTotal - left.revenueTotal;
    })
    .slice(0, 5)
    .map((item) => ({
      ...item,
      revenueTotal: Number(item.revenueTotal.toFixed(2)),
    }));
  const medicineRevenueTotal = Number(
    dispensedMedicineRows.reduce((sum, item) => sum + item.revenueTotal, 0).toFixed(2)
  );
  const dispensedUnitsTotal = dispensedMedicineRows.reduce(
    (sum, item) => sum + item.quantityTotal,
    0
  );

  return {
    filters: {
      clinicId: input.clinicId ?? null,
      preset: input.dateFrom && input.dateTo ? "custom" : input.preset ?? "7d",
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
      clinicIds: clinicIdStrings,
    },
    summary: {
      revenueTotal,
      appointmentsTotal,
      appointmentUtilizationRate:
        availableSlots > 0 ? Number(((occupiedSlots / availableSlots) * 100).toFixed(1)) : 0,
      cancellationRate:
        appointmentsTotal > 0
          ? Number(((cancelledAppointments / appointmentsTotal) * 100).toFixed(1))
          : 0,
    },
    medicineSummary: {
      revenueTotal: medicineRevenueTotal,
      dispensedUnitsTotal,
    },
    appointmentStatusBreakdown,
    revenueSeries,
    appointmentSeries,
    topDispensedMedicines,
    clinicPerformance: Array.from(performanceByClinic.values())
      .map((clinic) => ({
        clinicId: clinic.clinicId,
        clinicName: clinic.clinicName,
        revenueTotal: Number(clinic.revenueTotal.toFixed(2)),
        appointmentsTotal: clinic.appointmentsTotal,
        cancellationRate:
          clinic.appointmentsTotal > 0
            ? Number(((clinic.cancelledAppointments / clinic.appointmentsTotal) * 100).toFixed(1))
            : 0,
        appointmentUtilizationRate:
          clinic.availableSlots > 0
            ? Number(((clinic.occupiedSlots / clinic.availableSlots) * 100).toFixed(1))
            : 0,
      }))
      .sort((left, right) => right.revenueTotal - left.revenueTotal),
  };
};
