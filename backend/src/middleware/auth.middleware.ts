import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util";
import { getUserById } from "../services/user.service";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid authorization header" });
  }

  const token = header.replace("Bearer ", "");
  try {
    const payload = verifyToken(token);
    const user = await getUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.user = user;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
