import { Request, Response, NextFunction } from "express";

export type UserRole =
  | "admin"
  | "clinic_owner"
  | "doctor"
  | "receptionist"
  | "patient"
  | "clinic";

export const requireRole =
  (allowed: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!allowed.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
