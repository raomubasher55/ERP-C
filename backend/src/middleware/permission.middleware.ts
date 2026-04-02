import { Request, Response, NextFunction } from "express";
import { Permission, Role, hasPermission } from "../permissions";

export const requirePermission =
  (permission: Permission | Permission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const role = req.user.role as Role;
    const required = Array.isArray(permission) ? permission : [permission];
    const ok = required.some((perm) => hasPermission(role, perm));
    if (!ok) return res.status(403).json({ message: "Forbidden" });
    return next();
  };
