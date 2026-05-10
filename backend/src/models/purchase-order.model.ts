import { Document, Model, Schema, Types, model } from "mongoose";

export type PurchaseOrderStatus = "pending" | "received" | "cancelled";

export interface PurchaseOrderLine {
  inventoryItemId: Types.ObjectId;
  itemName: string;
  quantity: number;
  costPrice: number;
  lineTotal: number;
  expiryDate?: Date | null;
}

export interface PurchaseOrderDocument extends Document {
  clinicId: Types.ObjectId;
  supplierId: Types.ObjectId;
  orderNumber: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderLine[];
  totalAmount: number;
  orderedAt: Date;
  receivedAt?: Date | null;
  notes?: string;
  deletedAt?: Date | null;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderLineSchema = new Schema<PurchaseOrderLine>(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, default: null },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema<PurchaseOrderDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    orderNumber: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "received", "cancelled"],
      default: "pending",
      index: true,
    },
    items: { type: [purchaseOrderLineSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    orderedAt: { type: Date, required: true, default: () => new Date() },
    receivedAt: { type: Date, default: null },
    notes: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

purchaseOrderSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => ret,
});

const PurchaseOrder: Model<PurchaseOrderDocument> = model<PurchaseOrderDocument>(
  "PurchaseOrder",
  purchaseOrderSchema
);

export default PurchaseOrder;
