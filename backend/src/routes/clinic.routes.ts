import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import {
  createClinicHandler,
  deleteClinicHandler,
  getClinicHandler,
  listClinicsHandler,
  updateClinicHandler,
} from "../controller/clinic.controller";
import Clinic from "../models/clinic.model";

const router = Router();

// Public clinic list for patients (read-only)
router.get("/public", async (_req, res) => {
  try {
    const clinics = await Clinic.find({ isActive: true, deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();
    return res.status(200).json({ clinics: clinics.map((c) => c.toJSON()) });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

router.use(requireAuth);

// Read-only access for clinic staff/admin
router.get("/", requirePermission("clinics.read"), listClinicsHandler);
router.get("/:id", requirePermission("clinics.read"), getClinicHandler);

// Write access for clinic staff/admin only
router.post("/", requirePermission("clinics.manage"), createClinicHandler);
router.patch("/:id", requirePermission("clinics.manage"), updateClinicHandler);
router.delete("/:id", requirePermission("clinics.manage"), deleteClinicHandler);

export default router;
