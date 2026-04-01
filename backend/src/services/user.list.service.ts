import User from "../models/user.model";

export const listUsers = (opts: { role?: "admin" | "clinic" | "patient"; search?: string }) => {
  const filter: Record<string, unknown> = {};
  if (opts.role) filter.role = opts.role;
  if (opts.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }
  return User.find(filter).sort({ createdAt: -1 }).exec();
};
