import { Schema, model, Document, Model } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  role: "admin" | "clinic" | "patient";
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
      enum: ["admin", "clinic", "patient"],
      default: "patient",
      required: true,
    },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    // Remove sensitive fields
    delete ret.passwordHash;
    return ret;
  },
});

const User: Model<UserDocument> = model<UserDocument>("User", userSchema);

export default User;
