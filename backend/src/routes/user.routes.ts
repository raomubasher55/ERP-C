import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import {
  listUsersHandler,
  updateUserClinicsHandler,
  updateUserRoleHandler,
} from "../controller/user.controller";

const router = Router();

router.use(requireAuth, requirePermission("users.manage"));

router.get("/", listUsersHandler);
router.patch("/:id/role", updateUserRoleHandler);
router.patch("/:id/clinics", updateUserClinicsHandler);

export default router;
