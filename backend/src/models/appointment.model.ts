import { Schema, model, Document, Model, Types } from "mongoose";

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface AppointmentDocument extends Document {
  clinicId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  patientName: string;
  patientPhone?: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<AppointmentDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, trim: true },
    scheduledAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no_show"],
      default: "scheduled",
    },
    notes: { type: String, trim: true },
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
