import User from "../models/user.model";
import { Role } from "../permissions";

export const listUsers = (opts: { role?: Role; search?: string }) => {
  const filter: Record<string, unknown> = {};
  if (opts.role) {
    if (opts.role === "clinic" || opts.role === "clinic_owner") {
      filter.role = { $in: ["clinic", "clinic_owner"] };
    } else {
      filter.role = opts.role;
    }
  }
  if (opts.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }
  return User.find(filter).sort({ createdAt: -1 }).exec();
};
