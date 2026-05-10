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

export const billingServiceIdParamSchema = z.object({
  id: objectIdSchema("service id"),
});

export const invoiceIdParamSchema = z.object({
  id: objectIdSchema("invoice id"),
});

export const billingServiceCreateSchema = z.object({
  clinicId: objectIdSchema("clinicId"),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(60).optional(),
  description: z.string().trim().max(500).optional(),
  price: numberFromString(z.number().min(0)),
  isActive: z.boolean().optional(),
});

export const billingServiceUpdateSchema = billingServiceCreateSchema
  .omit({ clinicId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const billingServicesListQuerySchema = z.object({
  page: numberFromString(z.number().int().min(1)).default(1),
  limit: numberFromString(z.number().int().min(1).max(100)).default(20),
  clinicId: objectIdSchema("clinicId").optional(),
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

const invoiceServiceLineSchema = z.object({
  lineId: z.string().trim().min(1).max(80).optional(),
  type: z.literal("service"),
  serviceId: objectIdSchema("serviceId"),
  quantity: numberFromString(z.number().int().min(1)).default(1),
});

const invoiceMedicineLineSchema = z.object({
  lineId: z.string().trim().min(1).max(80).optional(),
  type: z.literal("dispensed_medicine"),
  inventoryItemId: objectIdSchema("inventoryItemId"),
  quantity: numberFromString(z.number().int().min(1)).default(1),
  unitPrice: numberFromString(z.number().min(0)).optional(),
});

const invoiceLineSchema = z.discriminatedUnion("type", [
  invoiceServiceLineSchema,
  invoiceMedicineLineSchema,
]);

export const invoiceDispenseSchema = z.object({
  lineIds: z.array(z.string().trim().min(1)).min(1, "At least one invoice line is required"),
});

export const invoiceCreateSchema = z.object({
  clinicId: objectIdSchema("clinicId"),
  appointmentId: objectIdSchema("appointmentId"),
  items: z.array(invoiceLineSchema).min(1, "At least one invoice item is required"),
  discount: numberFromString(z.number().min(0)).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const invoiceUpdateSchema = z
  .object({
    items: z.array(invoiceLineSchema).min(1).optional(),
    discount: numberFromString(z.number().min(0)).optional(),
    notes: z.string().trim().max(500).optional(),
    paidAmount: numberFromString(z.number().min(0)).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const invoicesListQuerySchema = z.object({
  page: numberFromString(z.number().int().min(1)).default(1),
  limit: numberFromString(z.number().int().min(1).max(100)).default(20),
  clinicId: objectIdSchema("clinicId").optional(),
  appointmentId: objectIdSchema("appointmentId").optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
});
