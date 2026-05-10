import { Document, Model, Schema, Types, model } from "mongoose";

export interface BillingServiceDocument extends Document {
  clinicId: Types.ObjectId;
  name: string;
  code?: string;
  description?: string;
  price: number;
  isActive: boolean;
  deletedAt?: Date | null;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const billingServiceSchema = new Schema<BillingServiceDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

billingServiceSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => ret,
});

const BillingService: Model<BillingServiceDocument> = model<BillingServiceDocument>(
  "BillingService",
  billingServiceSchema
);

export default BillingService;
