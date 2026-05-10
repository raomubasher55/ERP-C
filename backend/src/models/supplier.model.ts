import { Document, Model, Schema, Types, model } from "mongoose";

export interface SupplierDocument extends Document {
  clinicId: Types.ObjectId;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  deletedAt?: Date | null;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<SupplierDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

supplierSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => ret,
});

const Supplier: Model<SupplierDocument> = model<SupplierDocument>("Supplier", supplierSchema);

export default Supplier;
