import { Request, Response } from "express";
import { listUsers } from "../services/user.list.service";
import { userListQuerySchema } from "../validators/user.validator";
import { formatZodError } from "../utils/validation.util";

export const listUsersHandler = async (req: Request, res: Response) => {
  try {
    const parsed = userListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: formatZodError(parsed.error),
      });
    }

    const users = await listUsers(parsed.data);
    return res.status(200).json({ users: users.map((u) => u.toJSON()) });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};
