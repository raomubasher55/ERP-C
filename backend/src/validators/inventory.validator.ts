import { Types } from "mongoose";
import { z } from "zod";

const numberFromString = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    schema
  );

const objectIdSchema = (field: string) =>
  z.string().refine((value) => Types.ObjectId.isValid(value), {
    message: `Invalid ${field}`,
  });

export const supplierIdParamSchema = z.object({
  id: objectIdSchema("supplier id"),
});

export const inventoryItemIdParamSchema = z.object({
  id: objectIdSchema("inventory item id"),
});

export const purchaseOrderIdParamSchema = z.object({
  id: objectIdSchema("purchase order id"),
});

export const supplierCreateSchema = z.object({
  clinicId: objectIdSchema("clinicId"),
  name: z.string().trim().min(1).max(120),
  contactPerson: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(120).optional(),
  address: z.string().trim().max(250).optional(),
  isActive: z.boolean().optional(),
});

export const supplierUpdateSchema = supplierCreateSchema
  .omit({ clinicId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const inventoryItemCreateSchema = z.object({
  clinicId: objectIdSchema("clinicId"),
  supplierId: objectIdSchema("supplierId").optional(),
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(60).optional(),
  category: z.string().trim().max(80).optional(),
  unit: z.string().trim().min(1).max(40),
  currentStock: numberFromString(z.number().min(0)).optional(),
  minStockLevel: numberFromString(z.number().min(0)).optional(),
  purchasePrice: numberFromString(z.number().min(0)).optional(),
  salePrice: numberFromString(z.number().min(0)).optional(),
  expiryDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const inventoryItemUpdateSchema = inventoryItemCreateSchema
  .omit({ clinicId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const purchaseOrderLineSchema = z.object({
  inventoryItemId: objectIdSchema("inventoryItemId"),
  quantity: numberFromString(z.number().int().min(1)),
  costPrice: numberFromString(z.number().min(0)),
  expiryDate: z.string().datetime().optional(),
});

export const purchaseOrderCreateSchema = z.object({
  clinicId: objectIdSchema("clinicId"),
  supplierId: objectIdSchema("supplierId"),
  status: z.enum(["pending", "received", "cancelled"]).optional(),
  items: z.array(purchaseOrderLineSchema).min(1, "At least one purchase order line is required"),
  notes: z.string().trim().max(500).optional(),
});

export const purchaseOrderUpdateSchema = z
  .object({
    status: z.enum(["pending", "received", "cancelled"]).optional(),
    items: z.array(purchaseOrderLineSchema).min(1).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const inventoryListQuerySchema = z.object({
  clinicId: objectIdSchema("clinicId").optional(),
  page: numberFromString(z.number().int().min(1)).default(1),
  limit: numberFromString(z.number().int().min(1).max(100)).default(20),
  search: z.string().optional(),
  isActive: z
    .preprocess((value) => {
      if (typeof value === "string") {
        if (value === "true") return true;
        if (value === "false") return false;
      }
      return value;
    }, z.boolean())
    .optional(),
});

export const inventoryItemsListQuerySchema = inventoryListQuerySchema.extend({
  lowStockOnly: z
    .preprocess((value) => {
      if (typeof value === "string") {
        if (value === "true") return true;
        if (value === "false") return false;
      }
      return value;
    }, z.boolean())
    .optional(),
  expiringInDays: numberFromString(z.number().int().min(1).max(365)).optional(),
});

export const purchaseOrdersListQuerySchema = inventoryListQuerySchema.extend({
  supplierId: objectIdSchema("supplierId").optional(),
  status: z.enum(["pending", "received", "cancelled"]).optional(),
});

export const inventoryAlertsQuerySchema = z.object({
  clinicId: objectIdSchema("clinicId").optional(),
  daysToExpiry: numberFromString(z.number().int().min(1).max(365)).default(30),
});
