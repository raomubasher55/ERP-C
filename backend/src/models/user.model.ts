import { Schema, model, Document, Model, Types } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  role: "admin" | "clinic_owner" | "doctor" | "receptionist" | "patient" | "clinic";
  patientProfile?: {
    dateOfBirth?: Date;
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
  };
  contact?: {
    phone?: string;
    address?: string;
    city?: string;
    emergencyContact?: {
      name?: string;
      phone?: string;
      relation?: string;
    };
  };
  consent?: {
    treatment: boolean;
    dataProcessing: boolean;
    marketing: boolean;
    smsReminders: boolean;
    updatedAt?: Date;
  };
  clinicIds?: Types.ObjectId[];
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
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
    patientProfile: {
      dateOfBirth: { type: Date },
      gender: {
        type: String,
        enum: ["male", "female", "other", "prefer_not_to_say"],
      },
    },
    contact: {
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      emergencyContact: {
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        relation: { type: String, trim: true },
      },
    },
    consent: {
      treatment: { type: Boolean, default: false },
      dataProcessing: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
      smsReminders: { type: Boolean, default: false },
      updatedAt: { type: Date },
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
