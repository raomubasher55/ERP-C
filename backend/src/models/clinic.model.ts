import { Schema, model, Document, Model, Types } from "mongoose";

export interface ClinicDocument extends Document {
  ownerUserId: Types.ObjectId;
  appointments: number;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
  deletedAt?: Date | null;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  ownerName?: string;

  subscriptionPlan: "starter" | "pro" | "premium";

  workingDays: string[];
  startTime: string;
  endTime: string;
  slotDuration: number;

  breakTime?: {
    start: string;
    end: string;
  };

  features: {
    whatsappReminder: boolean;
    onlineBooking: boolean;
  };

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const clinicSchema = new Schema<ClinicDocument>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    appointments: { type: Number, default: 0, min: 0 },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    deletedAt: { type: Date, default: null },
    name: { type: String, required: true, trim: true },

    phone: { type: String, required: true, trim: true },

    email: { type: String, lowercase: true, trim: true },

    address: { type: String, trim: true },

    city: { type: String, default: "Lahore", trim: true },

    ownerName: { type: String, trim: true },

    subscriptionPlan: {
      type: String,
      enum: ["starter", "pro", "premium"],
      default: "starter",
    },

    workingDays: {
      type: [String],
      default: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },

    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String, required: true },   // "17:00"

    slotDuration: { type: Number, default: 15 },

    breakTime: {
      start: { type: String },
      end: { type: String },
    },

    features: {
      whatsappReminder: { type: Boolean, default: false },
      onlineBooking: { type: Boolean, default: false },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Clean JSON response
clinicSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    if (ret.appointments === undefined) {
      ret.appointments = 0;
    }
    return ret;
  },
});

const Clinic: Model<ClinicDocument> = model<ClinicDocument>("Clinic", clinicSchema);

export default Clinic;
