import { Schema, model, Document, Model, Types } from "mongoose";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export interface AppointmentPrescription {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface AppointmentDocument extends Document {
  clinicId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
  deletedAt?: Date | null;
  patientName: string;
  patientPhone?: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  notes?: string;
  prescriptions: AppointmentPrescription[];
  createdAt: Date;
  updatedAt: Date;
}

const appointmentPrescriptionSchema = new Schema<AppointmentPrescription>(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
    duration: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const appointmentSchema = new Schema<AppointmentDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    deletedAt: { type: Date, default: null },
    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, trim: true },
    scheduledAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "scheduled", "completed", "cancelled", "no_show"],
      default: "pending",
    },
    notes: { type: String, trim: true },
    prescriptions: { type: [appointmentPrescriptionSchema], default: [] },
  },
  { timestamps: true }
);

appointmentSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => ret,
});

const Appointment: Model<AppointmentDocument> = model<AppointmentDocument>(
  "Appointment",
  appointmentSchema
);

export default Appointment;
