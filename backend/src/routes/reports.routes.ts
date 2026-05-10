import { Router } from "express";
import { reportsOverviewHandler } from "../controller/reports.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(requireAuth);
router.get("/overview", requirePermission("reports.read"), reportsOverviewHandler);

export default router;
