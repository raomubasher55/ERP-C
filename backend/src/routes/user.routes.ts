import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { listUsersHandler } from "../controller/user.controller";

const router = Router();

router.use(requireAuth, requireRole(["admin"]));

router.get("/", listUsersHandler);

export default router;
