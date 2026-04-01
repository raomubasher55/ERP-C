import User, { UserDocument } from "../models/user.model";

export const getUserByEmail = (email: string) =>
  User.findOne({ email }).exec();

export const getUserById = (id: string) => User.findById(id).exec();

export const createUser = (data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: "admin" | "clinic" | "patient";
}): Promise<UserDocument> => User.create(data);
