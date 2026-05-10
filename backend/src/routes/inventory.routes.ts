import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { requireClinicOwnership } from "../middleware/tenant.middleware";
import {
  createInventoryItemHandler,
  createPurchaseOrderHandler,
  createSupplierHandler,
  deleteInventoryItemHandler,
  deletePurchaseOrderHandler,
  deleteSupplierHandler,
  getPurchaseOrderHandler,
  inventoryAlertsHandler,
  listInventoryItemsHandler,
  listPurchaseOrdersHandler,
  listSuppliersHandler,
  updateInventoryItemHandler,
  updatePurchaseOrderHandler,
  updateSupplierHandler,
} from "../controller/inventory.controller";

const router = Router();

router.use(requireAuth);

router.get("/alerts", requirePermission("inventory.read"), requireClinicOwnership("query"), inventoryAlertsHandler);

router.get("/suppliers", requirePermission("inventory.read"), requireClinicOwnership("query"), listSuppliersHandler);
router.post("/suppliers", requirePermission("inventory.manage"), requireClinicOwnership("body"), createSupplierHandler);
router.patch("/suppliers/:id", requirePermission("inventory.manage"), updateSupplierHandler);
router.delete("/suppliers/:id", requirePermission("inventory.manage"), deleteSupplierHandler);

router.get("/items", requirePermission("inventory.read"), requireClinicOwnership("query"), listInventoryItemsHandler);
router.post("/items", requirePermission("inventory.manage"), requireClinicOwnership("body"), createInventoryItemHandler);
router.patch("/items/:id", requirePermission("inventory.manage"), updateInventoryItemHandler);
router.delete("/items/:id", requirePermission("inventory.manage"), deleteInventoryItemHandler);

router.get("/purchase-orders", requirePermission("inventory.read"), requireClinicOwnership("query"), listPurchaseOrdersHandler);
router.get("/purchase-orders/:id", requirePermission("inventory.read"), getPurchaseOrderHandler);
router.post(
  "/purchase-orders",
  requirePermission("inventory.manage"),
  requireClinicOwnership("body"),
  createPurchaseOrderHandler
);
router.patch("/purchase-orders/:id", requirePermission("inventory.manage"), updatePurchaseOrderHandler);
router.delete("/purchase-orders/:id", requirePermission("inventory.manage"), deletePurchaseOrderHandler);

export default router;
