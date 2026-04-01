import { Request, Response } from "express";
import { loginUser, registerUser } from "../services/auth.service";
import { requireAuth } from "../middleware/auth.middleware";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { formatZodError } from "../utils/validation.util";

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const result = await registerUser(parsed.data);
    return res.status(201).json({
      token: result.token,
      user: result.user.toJSON(),
    });
  } catch (err) {
    const status = (err as Error & { status?: number }).status || 500;
    return res.status(status).json({ message: (err as Error).message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const result = await loginUser(parsed.data);
    return res.status(200).json({
      token: result.token,
      user: result.user.toJSON(),
    });
  } catch (err) {
    const status = (err as Error & { status?: number }).status || 500;
    return res.status(status).json({ message: (err as Error).message });
  }
};

export const me = [
  requireAuth,
  (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.status(200).json({ user: req.user.toJSON() });
  },
];
