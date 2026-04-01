import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  createClinicHandler,
  deleteClinicHandler,
  getClinicHandler,
  listClinicsHandler,
  updateClinicHandler,
} from "../controller/clinic.controller";

const router = Router();

router.use(requireAuth);

// Read-only access for all roles (admin, clinic, patient)
router.get("/", requireRole(["admin", "clinic", "patient"]), listClinicsHandler);
router.get("/:id", requireRole(["admin", "clinic", "patient"]), getClinicHandler);

// Write access for clinic + admin only
router.post("/", requireRole(["clinic", "admin"]), createClinicHandler);
router.patch("/:id", requireRole(["clinic", "admin"]), updateClinicHandler);
router.delete("/:id", requireRole(["clinic", "admin"]), deleteClinicHandler);

export default router;
