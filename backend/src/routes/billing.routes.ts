import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { requireClinicOwnership } from "../middleware/tenant.middleware";
import {
  createBillingServiceHandler,
  createInvoiceHandler,
  deleteBillingServiceHandler,
  deleteInvoiceHandler,
  dispenseInvoiceHandler,
  getInvoiceHandler,
  listBillingServicesHandler,
  listInvoicesHandler,
  updateBillingServiceHandler,
  updateInvoiceHandler,
} from "../controller/billing.controller";

const router = Router();

router.use(requireAuth);

router.get("/services", requirePermission("billing.read"), listBillingServicesHandler);
router.post(
  "/services",
  requirePermission("billing.manage"),
  requireClinicOwnership("body"),
  createBillingServiceHandler
);
router.patch("/services/:id", requirePermission("billing.manage"), updateBillingServiceHandler);
router.delete("/services/:id", requirePermission("billing.manage"), deleteBillingServiceHandler);

router.get("/invoices", requirePermission("billing.read"), listInvoicesHandler);
router.get("/invoices/:id", requirePermission("billing.read"), getInvoiceHandler);
router.post(
  "/invoices",
  requirePermission("billing.manage"),
  requireClinicOwnership("body"),
  createInvoiceHandler
);
router.patch("/invoices/:id/dispense", requirePermission("billing.manage"), dispenseInvoiceHandler);
router.patch("/invoices/:id", requirePermission("billing.manage"), updateInvoiceHandler);
router.delete("/invoices/:id", requirePermission("billing.manage"), deleteInvoiceHandler);

export default router;
