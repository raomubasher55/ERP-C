import { Document, Model, Schema, Types, model } from "mongoose";

export interface InventoryItemDocument extends Document {
  clinicId: Types.ObjectId;
  supplierId?: Types.ObjectId | null;
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  purchasePrice: number;
  salePrice?: number;
  expiryDate?: Date | null;
  isActive: boolean;
  deletedAt?: Date | null;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<InventoryItemDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", default: null, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    category: { type: String, trim: true },
    unit: { type: String, required: true, trim: true, default: "unit" },
    currentStock: { type: Number, required: true, min: 0, default: 0 },
    minStockLevel: { type: Number, required: true, min: 0, default: 0 },
    purchasePrice: { type: Number, required: true, min: 0, default: 0 },
    salePrice: { type: Number, min: 0 },
    expiryDate: { type: Date, default: null, index: true },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

inventoryItemSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => ret,
});

const InventoryItem: Model<InventoryItemDocument> = model<InventoryItemDocument>(
  "InventoryItem",
  inventoryItemSchema
);

export default InventoryItem;
