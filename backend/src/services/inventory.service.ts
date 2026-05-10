import { Types } from "mongoose";
import InventoryItem from "../models/inventory-item.model";
import PurchaseOrder, { PurchaseOrderLine, PurchaseOrderStatus } from "../models/purchase-order.model";
import Supplier from "../models/supplier.model";

export type SupplierCreateInput = {
  clinicId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
};

export type SupplierUpdateInput = Partial<
  Omit<SupplierCreateInput, "clinicId" | "createdByUserId">
>;

export type InventoryItemCreateInput = {
  clinicId: string;
  supplierId?: string;
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  currentStock?: number;
  minStockLevel?: number;
  purchasePrice?: number;
  salePrice?: number;
  expiryDate?: Date | null;
  isActive?: boolean;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
};

export type InventoryItemUpdateInput = Partial<
  Omit<InventoryItemCreateInput, "clinicId" | "createdByUserId">
>;

export type PurchaseOrderLineInput = {
  inventoryItemId: string;
  quantity: number;
  costPrice: number;
  expiryDate?: Date | null;
};

export type PurchaseOrderCreateInput = {
  clinicId: string;
  supplierId: string;
  status?: PurchaseOrderStatus;
  items: PurchaseOrderLineInput[];
  notes?: string;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
};

export type PurchaseOrderUpdateInput = Partial<{
  status: PurchaseOrderStatus;
  notes: string;
  items: PurchaseOrderLineInput[];
  updatedByUserId?: Types.ObjectId;
}>;

const buildOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `PO-${timestamp}-${random}`;
};

const createPurchaseOrderLines = (
  inputs: PurchaseOrderLineInput[],
  items: Awaited<ReturnType<typeof getInventoryItemsByIds>>
): PurchaseOrderLine[] =>
  inputs.map((input) => {
    const item = items.find((entry) => String(entry._id) === input.inventoryItemId);
    if (!item) {
      throw new Error(`Inventory item not found: ${input.inventoryItemId}`);
    }

    return {
      inventoryItemId: item._id,
      itemName: item.name,
      quantity: input.quantity,
      costPrice: input.costPrice,
      lineTotal: Number((input.quantity * input.costPrice).toFixed(2)),
      expiryDate: input.expiryDate ?? null,
    };
  });

export const createSupplier = (payload: SupplierCreateInput) =>
  Supplier.create({
    clinicId: new Types.ObjectId(payload.clinicId),
    name: payload.name,
    contactPerson: payload.contactPerson,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    isActive: payload.isActive ?? true,
    createdByUserId: payload.createdByUserId,
    updatedByUserId: payload.updatedByUserId ?? payload.createdByUserId,
  });

export const listSuppliers = async (
  clinicIds: Types.ObjectId[] | null,
  opts: {
    clinicId?: string;
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
  }
) => {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (clinicIds) {
    filter.clinicId = { $in: clinicIds };
  }
  if (opts.clinicId) {
    filter.clinicId = new Types.ObjectId(opts.clinicId);
  }
  if (opts.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ name: regex }, { contactPerson: regex }, { phone: regex }, { email: regex }];
  }
  if (typeof opts.isActive === "boolean") {
    filter.isActive = opts.isActive;
  }

  const skip = (opts.page - 1) * opts.limit;
  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit).exec(),
    Supplier.countDocuments(filter).exec(),
  ]);

  return { suppliers, total };
};

export const getSupplierById = (id: string) =>
  Supplier.findOne({ _id: id, deletedAt: null }).exec();

export const updateSupplier = (id: string, updates: SupplierUpdateInput) =>
  Supplier.findOneAndUpdate({ _id: id, deletedAt: null }, updates, {
    new: true,
    runValidators: true,
  }).exec();

export const deleteSupplier = (id: string, updatedByUserId?: Types.ObjectId) =>
  Supplier.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date(), isActive: false, updatedByUserId },
    { new: true }
  ).exec();

export const createInventoryItem = (payload: InventoryItemCreateInput) =>
  InventoryItem.create({
    clinicId: new Types.ObjectId(payload.clinicId),
    supplierId: payload.supplierId ? new Types.ObjectId(payload.supplierId) : null,
    name: payload.name,
    sku: payload.sku,
    category: payload.category,
    unit: payload.unit,
    currentStock: payload.currentStock ?? 0,
    minStockLevel: payload.minStockLevel ?? 0,
    purchasePrice: payload.purchasePrice ?? 0,
    salePrice: payload.salePrice,
    expiryDate: payload.expiryDate ?? null,
    isActive: payload.isActive ?? true,
    createdByUserId: payload.createdByUserId,
    updatedByUserId: payload.updatedByUserId ?? payload.createdByUserId,
  });

export const listInventoryItems = async (
  clinicIds: Types.ObjectId[] | null,
  opts: {
    clinicId?: string;
    page: number;
    limit: number;
    search?: string;
    lowStockOnly?: boolean;
    expiringInDays?: number;
    isActive?: boolean;
  }
) => {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (clinicIds) {
    filter.clinicId = { $in: clinicIds };
  }
  if (opts.clinicId) {
    filter.clinicId = new Types.ObjectId(opts.clinicId);
  }
  if (opts.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ name: regex }, { sku: regex }, { category: regex }];
  }
  if (typeof opts.isActive === "boolean") {
    filter.isActive = opts.isActive;
  }
  if (opts.expiringInDays !== undefined) {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + opts.expiringInDays);
    filter.expiryDate = { $ne: null, $gte: now, $lte: cutoff };
  }
  if (opts.lowStockOnly) {
    filter.$expr = { $lte: ["$currentStock", "$minStockLevel"] };
  }

  const skip = (opts.page - 1) * opts.limit;
  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit).exec(),
    InventoryItem.countDocuments(filter).exec(),
  ]);

  return { items, total };
};

export const getInventoryItemById = (id: string) =>
  InventoryItem.findOne({ _id: id, deletedAt: null }).exec();

export const getInventoryItemsByIds = (clinicId: string, ids: string[]) =>
  InventoryItem.find({
    _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    clinicId: new Types.ObjectId(clinicId),
    deletedAt: null,
  }).exec();

export const updateInventoryItem = (id: string, updates: InventoryItemUpdateInput) =>
  InventoryItem.findOneAndUpdate(
    { _id: id, deletedAt: null },
    {
      ...updates,
      supplierId:
        updates.supplierId === undefined
          ? undefined
          : updates.supplierId
            ? new Types.ObjectId(updates.supplierId)
            : null,
      expiryDate:
        updates.expiryDate === undefined
          ? undefined
          : updates.expiryDate,
    },
    {
      new: true,
      runValidators: true,
    }
  ).exec();

export const deleteInventoryItem = (id: string, updatedByUserId?: Types.ObjectId) =>
  InventoryItem.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date(), isActive: false, updatedByUserId },
    { new: true }
  ).exec();

export const createPurchaseOrder = async (payload: PurchaseOrderCreateInput) => {
  const items = await getInventoryItemsByIds(
    payload.clinicId,
    payload.items.map((item) => item.inventoryItemId)
  );
  const orderLines = createPurchaseOrderLines(payload.items, items);
  const totalAmount = Number(orderLines.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));

  const purchaseOrder = await PurchaseOrder.create({
    clinicId: new Types.ObjectId(payload.clinicId),
    supplierId: new Types.ObjectId(payload.supplierId),
    orderNumber: buildOrderNumber(),
    status: payload.status ?? "pending",
    items: orderLines,
    totalAmount,
    notes: payload.notes,
    orderedAt: new Date(),
    receivedAt: payload.status === "received" ? new Date() : null,
    createdByUserId: payload.createdByUserId,
    updatedByUserId: payload.updatedByUserId ?? payload.createdByUserId,
  });

  if (purchaseOrder.status === "received") {
    await applyPurchaseOrderReceipt(purchaseOrder._id);
    return getPurchaseOrderById(String(purchaseOrder._id));
  }

  return purchaseOrder;
};

export const listPurchaseOrders = async (
  clinicIds: Types.ObjectId[] | null,
  opts: {
    clinicId?: string;
    supplierId?: string;
    status?: PurchaseOrderStatus;
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
  if (opts.supplierId) {
    filter.supplierId = new Types.ObjectId(opts.supplierId);
  }
  if (opts.status) {
    filter.status = opts.status;
  }

  const skip = (opts.page - 1) * opts.limit;
  const [purchaseOrders, total] = await Promise.all([
    PurchaseOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit).exec(),
    PurchaseOrder.countDocuments(filter).exec(),
  ]);

  return { purchaseOrders, total };
};

export const getPurchaseOrderById = (id: string) =>
  PurchaseOrder.findOne({ _id: id, deletedAt: null }).exec();

export const applyPurchaseOrderReceipt = async (purchaseOrderId: Types.ObjectId) => {
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId).exec();
  if (!purchaseOrder || purchaseOrder.deletedAt) return null;
  if (purchaseOrder.status !== "received") return purchaseOrder;

  await Promise.all(
    purchaseOrder.items.map((line) =>
      InventoryItem.findByIdAndUpdate(line.inventoryItemId, {
        $inc: { currentStock: line.quantity },
        ...(line.expiryDate ? { expiryDate: line.expiryDate } : {}),
      }).exec()
    )
  );

  return purchaseOrder;
};

export const updatePurchaseOrder = async (id: string, updates: PurchaseOrderUpdateInput) => {
  const existing = await getPurchaseOrderById(id);
  if (!existing) return null;

  if (existing.status === "received" || existing.status === "cancelled") {
    if (
      (updates.status && updates.status !== existing.status) ||
      updates.items
    ) {
      throw new Error("Received or cancelled purchase orders cannot be changed.");
    }
  }

  let orderLines = existing.items;
  if (updates.items) {
    const items = await getInventoryItemsByIds(
      String(existing.clinicId),
      updates.items.map((item) => item.inventoryItemId)
    );
    orderLines = createPurchaseOrderLines(updates.items, items);
  }

  const totalAmount = Number(orderLines.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const nextStatus = updates.status ?? existing.status;
  const isReceivingNow = existing.status !== "received" && nextStatus === "received";

  const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
    { _id: id, deletedAt: null },
    {
      items: orderLines,
      totalAmount,
      status: nextStatus,
      notes: updates.notes ?? existing.notes,
      receivedAt: isReceivingNow ? new Date() : existing.receivedAt,
      updatedByUserId: updates.updatedByUserId ?? existing.updatedByUserId,
    },
    { new: true, runValidators: true }
  ).exec();

  if (purchaseOrder && isReceivingNow) {
    await applyPurchaseOrderReceipt(purchaseOrder._id);
    return getPurchaseOrderById(String(purchaseOrder._id));
  }

  return purchaseOrder;
};

export const deletePurchaseOrder = (id: string, updatedByUserId?: Types.ObjectId) =>
  PurchaseOrder.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date(), updatedByUserId },
    { new: true }
  ).exec();

export const getInventoryAlerts = async (
  clinicIds: Types.ObjectId[] | null,
  clinicId?: string,
  daysToExpiry = 30
) => {
  const clinicScopeFilter: Record<string, unknown> = { deletedAt: null };
  if (clinicIds) {
    clinicScopeFilter.clinicId = { $in: clinicIds };
  }
  if (clinicId) {
    clinicScopeFilter.clinicId = new Types.ObjectId(clinicId);
  }

  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysToExpiry);

  const lowStockFilter = {
    ...clinicScopeFilter,
    isActive: true,
    $expr: { $lte: ["$currentStock", "$minStockLevel"] },
  };
  const expiringFilter = {
    ...clinicScopeFilter,
    isActive: true,
    expiryDate: { $ne: null, $gte: now, $lte: cutoff },
  };
  const purchaseOrderFilter = {
    ...clinicScopeFilter,
    status: "pending",
  };

  const [lowStockItems, expiringItems, purchaseOrders] = await Promise.all([
    InventoryItem.find(lowStockFilter).sort({ currentStock: 1, createdAt: -1 }).limit(10).exec(),
    InventoryItem.find(expiringFilter).sort({ expiryDate: 1 }).limit(10).exec(),
    PurchaseOrder.find(purchaseOrderFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .exec(),
  ]);

  return {
    lowStockItems,
    expiringItems,
    openPurchaseOrders: purchaseOrders,
  };
};
