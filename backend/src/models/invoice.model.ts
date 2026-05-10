import { Document, Model, Schema, Types, model } from "mongoose";

export type InvoicePaymentStatus = "unpaid" | "partial" | "paid";
export type InvoiceItemType = "service" | "dispensed_medicine";
export type InvoiceMedicineDispenseStatus = "pending" | "dispensed";

export interface InvoiceItem {
  lineId: string;
  type: InvoiceItemType;
  displayName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  serviceId?: Types.ObjectId | null;
  inventoryItemId?: Types.ObjectId | null;
  dispenseStatus?: InvoiceMedicineDispenseStatus;
  dispensedAt?: Date | null;
  dispensedByUserId?: Types.ObjectId | null;
}

export interface InvoiceDocument extends Document {
  clinicId: Types.ObjectId;
  appointmentId: Types.ObjectId;
  patientUserId?: Types.ObjectId;
  patientName: string;
  patientPhone?: string;
  scheduledAt: Date;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentStatus: InvoicePaymentStatus;
  receiptNumber: string;
  notes?: string;
  issuedAt: Date;
  paidAt?: Date | null;
  deletedAt?: Date | null;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<InvoiceItem>(
  {
    lineId: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["service", "dispensed_medicine"],
      required: true,
    },
    displayName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    serviceId: { type: Schema.Types.ObjectId, ref: "BillingService", default: null },
    inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", default: null },
    dispenseStatus: {
      type: String,
      enum: ["pending", "dispensed"],
      default: null,
    },
    dispensedAt: { type: Date, default: null },
    dispensedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
    patientUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, trim: true },
    scheduledAt: { type: Date, required: true, index: true },
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
      index: true,
    },
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    notes: { type: String, trim: true },
    issuedAt: { type: Date, required: true, default: () => new Date() },
    paidAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

invoiceSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => ret,
});

const Invoice: Model<InvoiceDocument> = model<InvoiceDocument>("Invoice", invoiceSchema);

export default Invoice;
