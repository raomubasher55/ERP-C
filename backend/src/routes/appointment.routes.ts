import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  createAppointmentHandler,
  deleteAppointmentHandler,
  getAppointmentHandler,
  listAppointmentsHandler,
  todayAppointmentsHandler,
  updateAppointmentHandler,
} from "../controller/appointment.controller";

const router = Router();

router.use(requireAuth, requireRole(["admin", "clinic", "patient"]));

router.get("/", listAppointmentsHandler);
router.get("/today", todayAppointmentsHandler);
router.get("/:id", getAppointmentHandler);
router.post("/", createAppointmentHandler);
router.patch("/:id", updateAppointmentHandler);
router.delete("/:id", deleteAppointmentHandler);

export default router;
