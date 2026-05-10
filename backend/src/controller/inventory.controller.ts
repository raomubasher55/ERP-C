import { Request, Response } from "express";
import { Types } from "mongoose";
import Clinic from "../models/clinic.model";
import {
  createInventoryItem,
  createPurchaseOrder,
  createSupplier,
  deleteInventoryItem,
  deletePurchaseOrder,
  deleteSupplier,
  getInventoryAlerts,
  getInventoryItemById,
  getPurchaseOrderById,
  getSupplierById,
  listInventoryItems,
  listPurchaseOrders,
  listSuppliers,
  updateInventoryItem,
  updatePurchaseOrder,
  updateSupplier,
} from "../services/inventory.service";
import {
  inventoryAlertsQuerySchema,
  inventoryItemCreateSchema,
  inventoryItemIdParamSchema,
  inventoryItemsListQuerySchema,
  inventoryItemUpdateSchema,
  inventoryListQuerySchema,
  purchaseOrderCreateSchema,
  purchaseOrderIdParamSchema,
  purchaseOrdersListQuerySchema,
  purchaseOrderUpdateSchema,
  supplierCreateSchema,
  supplierIdParamSchema,
  supplierUpdateSchema,
} from "../validators/inventory.validator";
import { formatZodError } from "../utils/validation.util";

const isClinicOwnerRole = (role?: string) => role === "clinic" || role === "clinic_owner";
const isClinicStaffRole = (role?: string) => role === "doctor" || role === "receptionist";
const canManageInventory = (role?: string) =>
  role === "admin" || role === "receptionist" || isClinicOwnerRole(role);
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
  return [];
};

const ensureClinicAccess = async (
  user: { role?: string; _id: Types.ObjectId; clinicIds?: Types.ObjectId[] },
  clinicId: string | Types.ObjectId
) => {
  if (user.role === "admin") return true;
  const clinicIds = await getAccessibleClinicIds(user);
  return (clinicIds ?? []).some((id) => objectIdEquals(id, clinicId));
};

export const listSuppliersHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = inventoryListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const clinicIds = await getAccessibleClinicIds(req.user);
    if (parsed.data.clinicId && clinicIds) {
      const hasAccess = clinicIds.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!hasAccess) return res.status(403).json({ message: "Forbidden" });
    }

    const { suppliers, total } = await listSuppliers(clinicIds, parsed.data);
    return res.status(200).json({
      suppliers: suppliers.map((supplier) => supplier.toJSON()),
      page: parsed.data.page,
      limit: parsed.data.limit,
      total,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const createSupplierHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageInventory(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = supplierCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const hasAccess = await ensureClinicAccess(req.user, parsed.data.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const supplier = await createSupplier({
      ...parsed.data,
      createdByUserId: req.user._id,
      updatedByUserId: req.user._id,
    });

    return res.status(201).json({ supplier: supplier.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const updateSupplierHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageInventory(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsedParams = supplierIdParamSchema.safeParse(req.params);
    const parsedBody = supplierUpdateSchema.safeParse(req.body);
    if (!parsedParams.success || !parsedBody.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError((!parsedParams.success ? parsedParams.error : parsedBody.error) as never),
      });
    }

    const existing = await getSupplierById(parsedParams.data.id);
    if (!existing) return res.status(404).json({ message: "Supplier not found" });

    const hasAccess = await ensureClinicAccess(req.user, existing.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const supplier = await updateSupplier(parsedParams.data.id, {
      ...parsedBody.data,
      updatedByUserId: req.user._id,
    });

    return res.status(200).json({ supplier: supplier?.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const deleteSupplierHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageInventory(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = supplierIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const existing = await getSupplierById(parsed.data.id);
    if (!existing) return res.status(404).json({ message: "Supplier not found" });

    const hasAccess = await ensureClinicAccess(req.user, existing.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const supplier = await deleteSupplier(parsed.data.id, req.user._id);
    return res.status(200).json({ supplier: supplier?.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const listInventoryItemsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = inventoryItemsListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const clinicIds = await getAccessibleClinicIds(req.user);
    if (parsed.data.clinicId && clinicIds) {
      const hasAccess = clinicIds.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!hasAccess) return res.status(403).json({ message: "Forbidden" });
    }

    const { items, total } = await listInventoryItems(clinicIds, parsed.data);
    return res.status(200).json({
      items: items.map((item) => item.toJSON()),
      page: parsed.data.page,
      limit: parsed.data.limit,
      total,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const createInventoryItemHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageInventory(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = inventoryItemCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const hasAccess = await ensureClinicAccess(req.user, parsed.data.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const item = await createInventoryItem({
      ...parsed.data,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      createdByUserId: req.user._id,
      updatedByUserId: req.user._id,
    });

    return res.status(201).json({ item: item.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const updateInventoryItemHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageInventory(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsedParams = inventoryItemIdParamSchema.safeParse(req.params);
    const parsedBody = inventoryItemUpdateSchema.safeParse(req.body);
    if (!parsedParams.success || !parsedBody.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError((!parsedParams.success ? parsedParams.error : parsedBody.error) as never),
      });
    }

    const existing = await getInventoryItemById(parsedParams.data.id);
    if (!existing) return res.status(404).json({ message: "Inventory item not found" });

    const hasAccess = await ensureClinicAccess(req.user, existing.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const item = await updateInventoryItem(parsedParams.data.id, {
      ...parsedBody.data,
      expiryDate:
        parsedBody.data.expiryDate === undefined
          ? undefined
          : parsedBody.data.expiryDate
            ? new Date(parsedBody.data.expiryDate)
            : null,
      updatedByUserId: req.user._id,
    });

    return res.status(200).json({ item: item?.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const deleteInventoryItemHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageInventory(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = inventoryItemIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const existing = await getInventoryItemById(parsed.data.id);
    if (!existing) return res.status(404).json({ message: "Inventory item not found" });

    const hasAccess = await ensureClinicAccess(req.user, existing.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const item = await deleteInventoryItem(parsed.data.id, req.user._id);
    return res.status(200).json({ item: item?.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const listPurchaseOrdersHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = purchaseOrdersListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const clinicIds = await getAccessibleClinicIds(req.user);
    if (parsed.data.clinicId && clinicIds) {
      const hasAccess = clinicIds.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!hasAccess) return res.status(403).json({ message: "Forbidden" });
    }

    const { purchaseOrders, total } = await listPurchaseOrders(clinicIds, parsed.data);
    return res.status(200).json({
      purchaseOrders: purchaseOrders.map((purchaseOrder) => purchaseOrder.toJSON()),
      page: parsed.data.page,
      limit: parsed.data.limit,
      total,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const getPurchaseOrderHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = purchaseOrderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const purchaseOrder = await getPurchaseOrderById(parsed.data.id);
    if (!purchaseOrder) return res.status(404).json({ message: "Purchase order not found" });

    const hasAccess = await ensureClinicAccess(req.user, purchaseOrder.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    return res.status(200).json({ purchaseOrder: purchaseOrder.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const createPurchaseOrderHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageInventory(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = purchaseOrderCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const hasAccess = await ensureClinicAccess(req.user, parsed.data.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const purchaseOrder = await createPurchaseOrder({
      ...parsed.data,
      items: parsed.data.items.map((item) => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      })),
      createdByUserId: req.user._id,
      updatedByUserId: req.user._id,
    });

    return res.status(201).json({ purchaseOrder: purchaseOrder?.toJSON() });
  } catch (err) {
    const message = (err as Error).message;
    return res.status(500).json({ message });
  }
};

export const updatePurchaseOrderHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageInventory(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsedParams = purchaseOrderIdParamSchema.safeParse(req.params);
    const parsedBody = purchaseOrderUpdateSchema.safeParse(req.body);
    if (!parsedParams.success || !parsedBody.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError((!parsedParams.success ? parsedParams.error : parsedBody.error) as never),
      });
    }

    const existing = await getPurchaseOrderById(parsedParams.data.id);
    if (!existing) return res.status(404).json({ message: "Purchase order not found" });

    const hasAccess = await ensureClinicAccess(req.user, existing.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const purchaseOrder = await updatePurchaseOrder(parsedParams.data.id, {
      ...parsedBody.data,
      items: parsedBody.data.items?.map((item) => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      })),
      updatedByUserId: req.user._id,
    });

    return res.status(200).json({ purchaseOrder: purchaseOrder?.toJSON() });
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message });
  }
};

export const deletePurchaseOrderHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!canManageInventory(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = purchaseOrderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const existing = await getPurchaseOrderById(parsed.data.id);
    if (!existing) return res.status(404).json({ message: "Purchase order not found" });

    const hasAccess = await ensureClinicAccess(req.user, existing.clinicId);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden" });

    const purchaseOrder = await deletePurchaseOrder(parsed.data.id, req.user._id);
    return res.status(200).json({ purchaseOrder: purchaseOrder?.toJSON() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

export const inventoryAlertsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = inventoryAlertsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const clinicIds = await getAccessibleClinicIds(req.user);
    if (parsed.data.clinicId && clinicIds) {
      const hasAccess = clinicIds.some((id) => objectIdEquals(id, parsed.data.clinicId));
      if (!hasAccess) return res.status(403).json({ message: "Forbidden" });
    }

    const alerts = await getInventoryAlerts(clinicIds, parsed.data.clinicId, parsed.data.daysToExpiry);
    return res.status(200).json({
      lowStockItems: alerts.lowStockItems.map((item) => item.toJSON()),
      expiringItems: alerts.expiringItems.map((item) => item.toJSON()),
      openPurchaseOrders: alerts.openPurchaseOrders.map((purchaseOrder) => purchaseOrder.toJSON()),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};
