import User, { UserDocument } from "../models/user.model";

export const getUserByEmail = (email: string) =>
  User.findOne({ email }).exec();

export const getUserById = (id: string) => User.findById(id).exec();

export const createUser = (data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: "admin" | "clinic_owner" | "doctor" | "receptionist" | "patient" | "clinic";
}): Promise<UserDocument> => User.create(data);

export const updateUserRole = (
  id: string,
  role: "admin" | "clinic_owner" | "doctor" | "receptionist" | "patient"
) =>
  User.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true }
  ).exec();

export const updateUserClinics = (id: string, clinicIds: string[]) =>
  User.findByIdAndUpdate(
    id,
    { clinicIds },
    { new: true, runValidators: true }
  ).exec();
