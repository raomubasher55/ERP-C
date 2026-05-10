import { Request, Response } from "express";
import { Types } from "mongoose";
import Clinic from "../models/clinic.model";
import {
  BillingError,
  createBillingService,
  createInvoice,
  dispenseInvoiceLines,
  deleteBillingService,
  deleteInvoice,
  getBillingServiceById,
  getInvoiceByAppointmentId,
  getInvoiceById,
  listBillingServices,
  listInvoices,
  updateBillingService,
  updateInvoice,
} from "../services/billing.service";
import { getAppointmentById } from "../services/appointment.service";
import {
  billingServiceCreateSchema,
  billingServiceIdParamSchema,
  billingServicesListQuerySchema,
  billingServiceUpdateSchema,
  invoiceCreateSchema,
  invoiceDispenseSchema,
  invoiceIdParamSchema,
  invoicesListQuerySchema,
  invoiceUpdateSchema,
} from "../validators/billing.validator";
import { formatZodError } from "../utils/validation.util";

const isPatientRole = (role?: string) => role === "patient";
const isClinicOwnerRole = (role?: string) => role === "clinic" || role === "clinic_owner";
const isClinicStaffRole = (role?: string) => role === "doctor" || role === "receptionist";
const canManageServiceCatalog = (role?: string) => role === "admin" || isClinicOwnerRole(role);
const objectIdEquals = (
  left: Types.ObjectId | string | null | undefined,
  right: Types.ObjectId | string | null | undefined
) => String(left) === String(right);

const getOwnedClinicIds = async (userId: Types.ObjectId) => {
  const clinics = await Clinic.find({ ownerUserId: userId, deletedAt: null }).select("_id").exec();
  return clinics.map((clinic) => clinic._id);
};

const getAccessibleClinicIds = async (user: {
  role?: string;
  _id: Types.ObjectId;
  clinicIds?: Types.ObjectId[];
}) => {
  if (user.role === "admin") return null;
  if (isClinicOwnerRole(user.role)) {
    return getOwnedClinicIds(user._id);
  }
  if (isClinicStaffRole(user.role)) {
    return user.clinicIds ?? [];
  }
  return null;
};

const canAccessClinic = async (
  user: { role?: string; _id: Types.ObjectId; clinicIds?: Types.ObjectId[] },
  clinicId: string | Types.ObjectId
) => {
  if (user.role === "admin") return true;
  if (isPatientRole(user.role)) return false;

  const accessibleClinicIds = await getAccessibleClinicIds(user);
  return (accessibleClinicIds ?? []).some((id) => objectIdEquals(id, clinicId));
};

const canAccessInvoice = async (
  req: Request,
  invoice: { clinicId: Types.ObjectId; patientUserId?: Types.ObjectId | null }
) => {
  if (!req.user) return false;
  if (req.user.role === "admin") return true;
  if (isPatientRole(req.user.role)) {
    return objectIdEquals(invoice.patientUserId, req.user._id);
  }
  return canAccessClinic(req.user, invoice.clinicId);
};

const handleBillingError = (res: Response, err: unknown) => {
  if (err instanceof BillingError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return res.status(500).json({ message: (err as Error).message });
};

export const listBillingServicesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (isPatientRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = billingServicesListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsed.error) });
    }

    const clinicIds = await getAccessibleClinicIds(req.user);
    if (parsed.data.clinicId && clinicIds) {
      const allowed = clinicIds.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!allowed) return res.status(403).json({ message: "Forbidden" });
    }

    const { services, total } = await listBillingServices(clinicIds, parsed.data);
    return res.status(200).json({
      services: services.map((service) => service.toJSON()),
      page: parsed.data.page,
      limit: parsed.data.limit,
      total,
    });
  } catch (err) {
    return handleBillingError(res, err);
  }
};

export const createBillingServiceHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageServiceCatalog(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = billingServiceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsed.error) });
    }

    const hasAccess = await canAccessClinic(req.user, parsed.data.clinicId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const service = await createBillingService({
      ...parsed.data,
      createdByUserId: req.user._id,
      updatedByUserId: req.user._id,
    });

    return res.status(201).json({ service: service.toJSON() });
  } catch (err) {
    return handleBillingError(res, err);
  }
};

export const updateBillingServiceHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageServiceCatalog(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsedParams = billingServiceIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsedParams.error) });
    }
    const parsedBody = billingServiceUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsedBody.error) });
    }

    const existing = await getBillingServiceById(parsedParams.data.id);
    if (!existing) return res.status(404).json({ message: "Service not found" });

    const hasAccess = await canAccessClinic(req.user, existing.clinicId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const service = await updateBillingService(parsedParams.data.id, {
      ...parsedBody.data,
      updatedByUserId: req.user._id,
    });

    return res.status(200).json({ service: service?.toJSON() });
  } catch (err) {
    return handleBillingError(res, err);
  }
};

export const deleteBillingServiceHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageServiceCatalog(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = billingServiceIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsed.error) });
    }

    const existing = await getBillingServiceById(parsed.data.id);
    if (!existing) return res.status(404).json({ message: "Service not found" });

    const hasAccess = await canAccessClinic(req.user, existing.clinicId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const service = await deleteBillingService(parsed.data.id, req.user._id);
    return res.status(200).json({ service: service?.toJSON() });
  } catch (err) {
    return handleBillingError(res, err);
  }
};

export const listInvoicesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = invoicesListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsed.error) });
    }

    const clinicIds = isPatientRole(req.user.role) ? null : await getAccessibleClinicIds(req.user);
    if (parsed.data.clinicId && clinicIds) {
      const allowed = clinicIds.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!allowed) return res.status(403).json({ message: "Forbidden" });
    }

    const { invoices, total } = await listInvoices(clinicIds, {
      ...parsed.data,
      patientUserId: isPatientRole(req.user.role) ? req.user._id : undefined,
    });

    return res.status(200).json({
      invoices: invoices.map((invoice) => invoice.toJSON()),
      page: parsed.data.page,
      limit: parsed.data.limit,
      total,
    });
  } catch (err) {
    return handleBillingError(res, err);
  }
};

export const getInvoiceHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = invoiceIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsed.error) });
    }

    const invoice = await getInvoiceById(parsed.data.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const hasAccess = await canAccessInvoice(req, invoice);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json({ invoice: invoice.toJSON() });
  } catch (err) {
    return handleBillingError(res, err);
  }
};

export const createInvoiceHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (isPatientRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = invoiceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsed.error) });
    }

    const hasClinicAccess = await canAccessClinic(req.user, parsed.data.clinicId);
    if (!hasClinicAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const appointment = await getAppointmentById(parsed.data.appointmentId);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (!objectIdEquals(appointment.clinicId, parsed.data.clinicId)) {
      return res.status(400).json({ message: "Appointment does not belong to the selected clinic." });
    }

    const existingInvoice = await getInvoiceByAppointmentId(parsed.data.appointmentId);
    if (existingInvoice) {
      return res.status(409).json({ message: "Invoice already exists for this appointment." });
    }

    const invoice = await createInvoice({
      ...parsed.data,
      createdByUserId: req.user._id,
      updatedByUserId: req.user._id,
    });

    if (!invoice) return res.status(404).json({ message: "Appointment not found" });

    return res.status(201).json({ invoice: invoice.toJSON() });
  } catch (err) {
    return handleBillingError(res, err);
  }
};

export const updateInvoiceHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (isPatientRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsedParams = invoiceIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsedParams.error) });
    }
    const parsedBody = invoiceUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsedBody.error) });
    }

    const existing = await getInvoiceById(parsedParams.data.id);
    if (!existing) return res.status(404).json({ message: "Invoice not found" });

    const hasAccess = await canAccessClinic(req.user, existing.clinicId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const invoice = await updateInvoice(parsedParams.data.id, {
      ...parsedBody.data,
      updatedByUserId: req.user._id,
    });

    return res.status(200).json({ invoice: invoice?.toJSON() });
  } catch (err) {
    return handleBillingError(res, err);
  }
};

export const dispenseInvoiceHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (isPatientRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsedParams = invoiceIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsedParams.error) });
    }
    const parsedBody = invoiceDispenseSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsedBody.error) });
    }

    const existing = await getInvoiceById(parsedParams.data.id);
    if (!existing) return res.status(404).json({ message: "Invoice not found" });

    const hasAccess = await canAccessClinic(req.user, existing.clinicId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const invoice = await dispenseInvoiceLines(
      parsedParams.data.id,
      parsedBody.data.lineIds,
      req.user._id
    );
    return res.status(200).json({ invoice: invoice?.toJSON() });
  } catch (err) {
    return handleBillingError(res, err);
  }
};

export const deleteInvoiceHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (isPatientRole(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = invoiceIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: formatZodError(parsed.error) });
    }

    const existing = await getInvoiceById(parsed.data.id);
    if (!existing) return res.status(404).json({ message: "Invoice not found" });

    const hasAccess = await canAccessClinic(req.user, existing.clinicId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const invoice = await deleteInvoice(parsed.data.id, req.user._id);
    return res.status(200).json({ invoice: invoice?.toJSON() });
  } catch (err) {
    return handleBillingError(res, err);
  }
};
