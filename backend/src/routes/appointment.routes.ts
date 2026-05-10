import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { requireClinicOwnership } from "../middleware/tenant.middleware";
import {
  createAppointmentHandler,
  deleteAppointmentHandler,
  getAppointmentHandler,
  listAppointmentsHandler,
  appointmentSlotsHandler,
  todayAppointmentsHandler,
  updateAppointmentHandler,
  updateAppointmentPrescriptionsHandler,
} from "../controller/appointment.controller";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requirePermission("appointments.read"),
  requireClinicOwnership("query"),
  listAppointmentsHandler
);
router.get(
  "/slots",
  requirePermission("appointments.read"),
  requireClinicOwnership("query"),
  appointmentSlotsHandler
);
router.get("/today", requirePermission("appointments.read"), todayAppointmentsHandler);
router.get("/:id", requirePermission("appointments.read"), getAppointmentHandler);
router.post(
  "/",
  requirePermission(["appointments.book", "appointments.manage"]),
  requireClinicOwnership("body"),
  createAppointmentHandler
);
router.patch(
  "/:id",
  requirePermission(["appointments.manage", "appointments.cancel"]),
  updateAppointmentHandler
);
router.patch(
  "/:id/prescriptions",
  requirePermission("appointments.manage"),
  updateAppointmentPrescriptionsHandler
);
router.delete("/:id", requirePermission("appointments.manage"), deleteAppointmentHandler);

export default router;
