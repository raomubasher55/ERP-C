import { Schema, model, Document, Model } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  role: "admin" | "clinic_owner" | "doctor" | "receptionist" | "patient" | "clinic";
  clinicIds?: Schema.Types.ObjectId[];
  createdByUserId?: Schema.Types.ObjectId;
  updatedByUserId?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "clinic_owner", "doctor", "receptionist", "patient", "clinic"],
      default: "patient",
      required: true,
    },
    clinicIds: [{ type: Schema.Types.ObjectId, ref: "Clinic" }],
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    // Remove sensitive fields
    delete ret.passwordHash;
    delete ret.createdByUserId;
    delete ret.updatedByUserId;
    return ret;
  },
});

const User: Model<UserDocument> = model<UserDocument>("User", userSchema);

export default User;
