import { Types } from "mongoose";
import Appointment from "../models/appointment.model";
import BillingService from "../models/billing-service.model";
import InventoryItem from "../models/inventory-item.model";
import Invoice, {
  InvoiceItem,
  InvoiceItemType,
  InvoiceMedicineDispenseStatus,
  InvoicePaymentStatus,
} from "../models/invoice.model";

export class BillingError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type BillingServiceCreateInput = {
  clinicId: string;
  name: string;
  code?: string;
  description?: string;
  price: number;
  isActive?: boolean;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
};

export type BillingServiceUpdateInput = Partial<
  Omit<BillingServiceCreateInput, "clinicId" | "createdByUserId">
>;

export type InvoiceServiceLineInput = {
  lineId?: string;
  type: "service";
  serviceId: string;
  quantity: number;
};

export type InvoiceMedicineLineInput = {
  lineId?: string;
  type: "dispensed_medicine";
  inventoryItemId: string;
  quantity: number;
  unitPrice?: number;
};

export type InvoiceLineInput = InvoiceServiceLineInput | InvoiceMedicineLineInput;

export type InvoiceCreateInput = {
  clinicId: string;
  appointmentId: string;
  items: InvoiceLineInput[];
  discount?: number;
  notes?: string;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
};

export type InvoiceUpdateInput = Partial<{
  items: InvoiceLineInput[];
  discount: number;
  notes: string;
  paidAmount: number;
  updatedByUserId?: Types.ObjectId;
}>;

const buildReceiptNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `INV-${timestamp}-${random}`;
};

const buildInvoiceLineId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `LINE-${timestamp}-${random}`;
};

export const derivePaymentStatus = (
  total: number,
  paidAmount: number
): { paymentStatus: InvoicePaymentStatus; paidAt: Date | null } => {
  if (paidAmount <= 0) {
    return { paymentStatus: "unpaid", paidAt: null };
  }
  if (paidAmount >= total) {
    return { paymentStatus: "paid", paidAt: new Date() };
  }
  return { paymentStatus: "partial", paidAt: null };
};

export const createBillingService = (payload: BillingServiceCreateInput) =>
  BillingService.create({
    clinicId: new Types.ObjectId(payload.clinicId),
    name: payload.name,
    code: payload.code,
    description: payload.description,
    price: payload.price,
    isActive: payload.isActive ?? true,
    createdByUserId: payload.createdByUserId,
    updatedByUserId: payload.updatedByUserId ?? payload.createdByUserId,
  });

export const listBillingServices = async (
  clinicIds: Types.ObjectId[] | null,
  opts: {
    clinicId?: string;
    search?: string;
    isActive?: boolean;
    page: number;
    limit: number;
  }
) => {
  const filter: Record<string, unknown> = { deletedAt: null };

  if (clinicIds) {
    filter.clinicId = { $in: clinicIds };
  }
  if (opts.clinicId) {
    filter.clinicId = new Types.ObjectId(opts.clinicId);
  }
  if (typeof opts.isActive === "boolean") {
    filter.isActive = opts.isActive;
  }
  if (opts.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ name: regex }, { code: regex }, { description: regex }];
  }

  const skip = (opts.page - 1) * opts.limit;
  const [services, total] = await Promise.all([
    BillingService.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit).exec(),
    BillingService.countDocuments(filter).exec(),
  ]);

  return { services, total };
};

export const getBillingServiceById = (id: string) =>
  BillingService.findOne({ _id: id, deletedAt: null }).exec();

export const updateBillingService = (id: string, updates: BillingServiceUpdateInput) =>
  BillingService.findOneAndUpdate(
    { _id: id, deletedAt: null },
    updates,
    { new: true, runValidators: true }
  ).exec();

export const deleteBillingService = (id: string, updatedByUserId?: Types.ObjectId) =>
  BillingService.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date(), isActive: false, updatedByUserId },
    { new: true }
  ).exec();

export const getServicesByIds = (clinicId: string, serviceIds: string[]) =>
  BillingService.find({
    _id: { $in: serviceIds.map((id) => new Types.ObjectId(id)) },
    clinicId: new Types.ObjectId(clinicId),
    isActive: true,
    deletedAt: null,
  }).exec();

export const getInventoryItemsByIds = (clinicId: string, inventoryItemIds: string[]) =>
  InventoryItem.find({
    _id: { $in: inventoryItemIds.map((id) => new Types.ObjectId(id)) },
    clinicId: new Types.ObjectId(clinicId),
    isActive: true,
    deletedAt: null,
  }).exec();

export const getInvoiceById = (id: string) =>
  Invoice.findOne({ _id: id, deletedAt: null }).exec();

export const getInvoiceByAppointmentId = (appointmentId: string) =>
  Invoice.findOne({ appointmentId: new Types.ObjectId(appointmentId), deletedAt: null }).exec();

export const listInvoices = async (
  clinicIds: Types.ObjectId[] | null,
  opts: {
    clinicId?: string;
    appointmentId?: string;
    paymentStatus?: InvoicePaymentStatus;
    patientUserId?: Types.ObjectId;
    page: number;
    limit: number;
  }
) => {
  const filter: Record<string, unknown> = { deletedAt: null };

  if (clinicIds) {
    filter.clinicId = { $in: clinicIds };
  }
  if (opts.clinicId) {
    filter.clinicId = new Types.ObjectId(opts.clinicId);
  }
  if (opts.appointmentId) {
    filter.appointmentId = new Types.ObjectId(opts.appointmentId);
  }
  if (opts.paymentStatus) {
    filter.paymentStatus = opts.paymentStatus;
  }
  if (opts.patientUserId) {
    filter.patientUserId = opts.patientUserId;
  }

  const skip = (opts.page - 1) * opts.limit;
  const [invoices, total] = await Promise.all([
    Invoice.find(filter).sort({ issuedAt: -1 }).skip(skip).limit(opts.limit).exec(),
    Invoice.countDocuments(filter).exec(),
  ]);

  return { invoices, total };
};

const normalizeMoney = (value: number) => Number(value.toFixed(2));

const hasDispensedMedicineLines = (items: InvoiceItem[]) =>
  items.some(
    (item) => item.type === "dispensed_medicine" && item.dispenseStatus === "dispensed"
  );

const assertDispensedLinesUnchanged = (
  existingItems: InvoiceItem[],
  nextItems: InvoiceLineInput[]
) => {
  const nextByLineId = new Map(
    nextItems.filter((item) => item.lineId).map((item) => [item.lineId as string, item])
  );

  for (const existingItem of existingItems) {
    if (
      existingItem.type !== "dispensed_medicine" ||
      existingItem.dispenseStatus !== "dispensed"
    ) {
      continue;
    }

    const submitted = nextByLineId.get(existingItem.lineId);
    if (!submitted) {
      throw new BillingError(409, "Dispensed medicine lines cannot be removed or replaced.");
    }
    if (submitted.type !== "dispensed_medicine") {
      throw new BillingError(409, "Dispensed medicine lines cannot change type.");
    }
    if (String(submitted.inventoryItemId) !== String(existingItem.inventoryItemId)) {
      throw new BillingError(409, "Dispensed medicine lines cannot change medicine item.");
    }
    if (submitted.quantity !== existingItem.quantity) {
      throw new BillingError(409, "Dispensed medicine quantities cannot be edited.");
    }
    if (
      submitted.unitPrice !== undefined &&
      normalizeMoney(submitted.unitPrice) !== normalizeMoney(existingItem.unitPrice)
    ) {
      throw new BillingError(409, "Dispensed medicine prices cannot be edited.");
    }
  }
};

const calculateInvoiceItems = (
  items: InvoiceLineInput[],
  services: Awaited<ReturnType<typeof getServicesByIds>>,
  inventoryItems: Awaited<ReturnType<typeof getInventoryItemsByIds>>,
  existingItemsByLineId = new Map<string, InvoiceItem>()
): InvoiceItem[] =>
  items.map((item) => {
    const existingLine = item.lineId ? existingItemsByLineId.get(item.lineId) : undefined;

    if (item.type === "service") {
      const service = services.find((entry) => String(entry._id) === item.serviceId);
      if (!service) {
        throw new BillingError(404, `Service not found: ${item.serviceId}`);
      }

      return {
        lineId: item.lineId ?? buildInvoiceLineId(),
        type: "service" as InvoiceItemType,
        displayName: service.name,
        quantity: item.quantity,
        unitPrice: service.price,
        lineTotal: normalizeMoney(service.price * item.quantity),
        serviceId: service._id,
        inventoryItemId: null,
        dispenseStatus: undefined,
        dispensedAt: null,
        dispensedByUserId: null,
      };
    }

    const inventoryItem = inventoryItems.find(
      (entry) => String(entry._id) === item.inventoryItemId
    );
    if (!inventoryItem) {
      throw new BillingError(404, `Inventory item not found: ${item.inventoryItemId}`);
    }

    const lockedPrice =
      existingLine?.type === "dispensed_medicine" &&
      existingLine.dispenseStatus === "dispensed"
        ? existingLine.unitPrice
        : undefined;
    const unitPrice =
      lockedPrice ?? item.unitPrice ?? inventoryItem.salePrice ?? null;

    if (unitPrice === null || unitPrice === undefined) {
      throw new BillingError(
        400,
        `Sale price is not configured for inventory item ${inventoryItem.name}.`
      );
    }

    return {
      lineId: item.lineId ?? buildInvoiceLineId(),
      type: "dispensed_medicine" as InvoiceItemType,
      displayName: inventoryItem.name,
      quantity: item.quantity,
      unitPrice,
      lineTotal: normalizeMoney(unitPrice * item.quantity),
      serviceId: null,
      inventoryItemId: inventoryItem._id,
      dispenseStatus: existingLine?.dispenseStatus ?? "pending",
      dispensedAt: existingLine?.dispensedAt ?? null,
      dispensedByUserId: existingLine?.dispensedByUserId ?? null,
    };
  });

export const createInvoice = async (payload: InvoiceCreateInput) => {
  const appointment = await Appointment.findOne({
    _id: new Types.ObjectId(payload.appointmentId),
    deletedAt: null,
  }).exec();

  if (!appointment) {
    return null;
  }

  const serviceIds = payload.items
    .filter((item): item is InvoiceServiceLineInput => item.type === "service")
    .map((item) => item.serviceId);
  const inventoryItemIds = payload.items
    .filter((item): item is InvoiceMedicineLineInput => item.type === "dispensed_medicine")
    .map((item) => item.inventoryItemId);

  const [services, inventoryItems] = await Promise.all([
    serviceIds.length ? getServicesByIds(payload.clinicId, serviceIds) : Promise.resolve([]),
    inventoryItemIds.length
      ? getInventoryItemsByIds(payload.clinicId, inventoryItemIds)
      : Promise.resolve([]),
  ]);

  const invoiceItems = calculateInvoiceItems(payload.items, services, inventoryItems);
  const subtotal = normalizeMoney(
    invoiceItems.reduce((sum, item) => sum + item.lineTotal, 0)
  );
  const discount = normalizeMoney(payload.discount ?? 0);
  const total = normalizeMoney(Math.max(subtotal - discount, 0));
  const { paymentStatus, paidAt } = derivePaymentStatus(total, 0);

  return Invoice.create({
    clinicId: new Types.ObjectId(payload.clinicId),
    appointmentId: appointment._id,
    patientUserId: appointment.createdByUserId,
    patientName: appointment.patientName,
    patientPhone: appointment.patientPhone,
    scheduledAt: appointment.scheduledAt,
    items: invoiceItems,
    subtotal,
    discount,
    total,
    paidAmount: 0,
    paymentStatus,
    receiptNumber: buildReceiptNumber(),
    notes: payload.notes,
    issuedAt: new Date(),
    paidAt,
    createdByUserId: payload.createdByUserId,
    updatedByUserId: payload.updatedByUserId ?? payload.createdByUserId,
  });
};

export const updateInvoice = async (id: string, updates: InvoiceUpdateInput) => {
  const existing = await getInvoiceById(id);
  if (!existing) return null;

  let items = existing.items;
  if (updates.items) {
    assertDispensedLinesUnchanged(existing.items, updates.items);

    const serviceIds = updates.items
      .filter((item): item is InvoiceServiceLineInput => item.type === "service")
      .map((item) => item.serviceId);
    const inventoryItemIds = updates.items
      .filter((item): item is InvoiceMedicineLineInput => item.type === "dispensed_medicine")
      .map((item) => item.inventoryItemId);

    const [services, inventoryItems] = await Promise.all([
      serviceIds.length ? getServicesByIds(String(existing.clinicId), serviceIds) : Promise.resolve([]),
      inventoryItemIds.length
        ? getInventoryItemsByIds(String(existing.clinicId), inventoryItemIds)
        : Promise.resolve([]),
    ]);

    const existingItemsByLineId = new Map(existing.items.map((item) => [item.lineId, item]));
    items = calculateInvoiceItems(updates.items, services, inventoryItems, existingItemsByLineId);
  }

  const subtotal = normalizeMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const discount = normalizeMoney(updates.discount ?? existing.discount);
  const total = normalizeMoney(Math.max(subtotal - discount, 0));
  const paidAmount = normalizeMoney(Math.min(updates.paidAmount ?? existing.paidAmount, total));
  const { paymentStatus, paidAt } = derivePaymentStatus(total, paidAmount);

  return Invoice.findOneAndUpdate(
    { _id: id, deletedAt: null },
    {
      items,
      subtotal,
      discount,
      total,
      paidAmount,
      paymentStatus,
      paidAt,
      notes: updates.notes ?? existing.notes,
      updatedByUserId: updates.updatedByUserId ?? existing.updatedByUserId,
    },
    { new: true, runValidators: true }
  ).exec();
};

export const dispenseInvoiceLines = async (
  id: string,
  lineIds: string[],
  updatedByUserId?: Types.ObjectId
) => {
  const invoice = await getInvoiceById(id);
  if (!invoice) return null;

  const targetItems = invoice.items.filter((item) => lineIds.includes(item.lineId));
  if (targetItems.length === 0) {
    throw new BillingError(404, "No matching invoice lines found.");
  }

  for (const item of targetItems) {
    if (item.type !== "dispensed_medicine") {
      throw new BillingError(400, "Only clinic-store medicine lines can be dispensed.");
    }
    if (item.dispenseStatus === "dispensed") {
      throw new BillingError(409, "One or more selected medicine lines are already dispensed.");
    }
    if (!item.inventoryItemId) {
      throw new BillingError(400, "Medicine line is missing its inventory source.");
    }
  }

  const quantityByInventoryItemId = new Map<string, number>();
  for (const item of targetItems) {
    const key = String(item.inventoryItemId);
    quantityByInventoryItemId.set(key, (quantityByInventoryItemId.get(key) ?? 0) + item.quantity);
  }

  const inventoryItems = await InventoryItem.find({
    _id: {
      $in: Array.from(quantityByInventoryItemId.keys()).map((entry) => new Types.ObjectId(entry)),
    },
    clinicId: invoice.clinicId,
    deletedAt: null,
    isActive: true,
  }).exec();

  if (inventoryItems.length !== quantityByInventoryItemId.size) {
    throw new BillingError(404, "One or more inventory items are no longer available.");
  }

  for (const inventoryItem of inventoryItems) {
    const requiredQuantity = quantityByInventoryItemId.get(String(inventoryItem._id)) ?? 0;
    if (inventoryItem.currentStock < requiredQuantity) {
      throw new BillingError(409, `Insufficient stock for ${inventoryItem.name}.`);
    }
  }

  const decremented: Array<{ inventoryItemId: Types.ObjectId; quantity: number }> = [];

  try {
    for (const inventoryItem of inventoryItems) {
      const quantity = quantityByInventoryItemId.get(String(inventoryItem._id)) ?? 0;
      const updated = await InventoryItem.findOneAndUpdate(
        {
          _id: inventoryItem._id,
          clinicId: invoice.clinicId,
          deletedAt: null,
          isActive: true,
          currentStock: { $gte: quantity },
        },
        { $inc: { currentStock: -quantity } },
        { new: true }
      ).exec();

      if (!updated) {
        throw new BillingError(409, `Insufficient stock for ${inventoryItem.name}.`);
      }

      decremented.push({ inventoryItemId: inventoryItem._id, quantity });
    }
  } catch (error) {
    await Promise.all(
      decremented.map((entry) =>
        InventoryItem.findByIdAndUpdate(entry.inventoryItemId, {
          $inc: { currentStock: entry.quantity },
        }).exec()
      )
    );
    throw error;
  }

  const dispensedAt = new Date();
  const nextItems = invoice.items.map((item) => ({
    lineId: item.lineId,
    type: item.type,
    displayName: item.displayName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    serviceId: item.serviceId ?? null,
    inventoryItemId: item.inventoryItemId ?? null,
    dispenseStatus: lineIds.includes(item.lineId)
      ? ("dispensed" as InvoiceMedicineDispenseStatus)
      : item.dispenseStatus,
    dispensedAt: lineIds.includes(item.lineId) ? dispensedAt : item.dispensedAt ?? null,
    dispensedByUserId: lineIds.includes(item.lineId)
      ? updatedByUserId ?? item.dispensedByUserId ?? null
      : item.dispensedByUserId ?? null,
  }));

  invoice.set("items", nextItems);
  invoice.set("updatedByUserId", updatedByUserId ?? invoice.updatedByUserId);
  await invoice.save();
  return invoice;
};

export const deleteInvoice = async (id: string, updatedByUserId?: Types.ObjectId) => {
  const existing = await getInvoiceById(id);
  if (!existing) return null;
  if (hasDispensedMedicineLines(existing.items)) {
    throw new BillingError(409, "Invoices with dispensed medicines cannot be deleted.");
  }

  return Invoice.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date(), updatedByUserId },
    { new: true }
  ).exec();
};
