# Market‑Ready ERP Roadmap (Detailed)

## Summary
Harden the current clinic/appointment MVP into a production‑ready, multi‑role ERP by sequencing security, multi‑tenant data integrity, core clinical workflows, billing, inventory, and reporting. This plan assumes clinics as the primary customer, with patient self‑service as a supporting flow.

## Key Changes / Implementation
1. **Multi‑Tenant Integrity (Week 1–2)**
   - Enforce `clinicId/ownerUserId` scoping on every query and write path.
   - Add centralized `tenantGuard` middleware for clinic/role checks.
   - Add audit fields on all models: `createdByUserId`, `updatedByUserId`.
   - Add soft‑delete (`isActive` or `deletedAt`) for critical entities.

2. **Role & Permission Model (Week 2)**
   - Expand roles: `admin`, `clinic_owner`, `doctor`, `receptionist`, `patient`.
   - Add permissions matrix and `requirePermission()` middleware.
   - Introduce admin endpoints for user role assignment.

3. **Appointments v2 (Week 2–3)**
   - Status pipeline: `pending → confirmed → completed/cancelled/no_show`.
   - Add reschedule policy and clinic availability rules.
   - Slot caching and conflict checks optimized per clinic/day.

4. **Patient Module (Week 3)**
   - Patient profile, contact info, consent.
   - Appointment history and cancellations.
   - Notifications (email first; WhatsApp later).

5. **Billing & Invoicing (Week 4–5)**
   - Services/pricing catalog.
   - Invoice creation per visit.
   - Payment status and receipts.

6. **Inventory/Pharmacy (Week 6)**
   - Stock items, suppliers, purchase orders.
   - Low‑stock alerts and expiry tracking.

7. **Reports & Analytics (Week 7)**
   - Daily revenue, appointment utilization, cancellation rates.
   - Admin clinic performance overview.

8. **Production Readiness (Parallel)**
   - Rate limiting, logging, monitoring (Sentry + basic metrics).
   - Backup strategy (daily Mongo snapshots).
   - CI tests + staging deployment.

## API / Interface Additions (High‑Level)
- `/api/admin/users` (role assignment, permissions)
- `/api/patients` (CRUD, history)
- `/api/appointments` (v2 status flow, reschedule)
- `/api/billing` (invoices, payments)
- `/api/inventory` (stock, suppliers)
- `/api/reports` (KPI dashboards)

## Test Plan
- Role enforcement tests for every endpoint.
- Appointment conflict + reschedule rules.
- Patient cancellation policy and history.
- Billing calculations and invoice totals.
- Inventory stock changes and audit logs.
- End‑to‑end flows (clinic → patient → appointment → billing).

## Assumptions
- Clinics are the primary tenant; patients are secondary users.
- Admin accounts are created manually or via admin panel.
- Start with email notifications; WhatsApp later.
- MongoDB remains the primary datastore.
