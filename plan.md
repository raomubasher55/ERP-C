# Market-Ready ERP Roadmap

## Summary
Harden the clinic ERP MVP into a production-ready, multi-role platform by sequencing tenant safety, operational workflows, billing, inventory, reporting, and subscription enforcement. Clinics remain the primary customer; patients remain a self-service user type within clinic workflows.

## Key Changes / Implementation
1. **Multi-Tenant Integrity**
   - Enforce `clinicId` / `ownerUserId` scoping on every read and write path.
   - Centralize clinic-access checks in middleware and services.
   - Add audit fields on all critical models.
   - Keep soft-delete behavior for operational entities.

2. **Role and Permission Model**
   - Maintain roles: `admin`, `clinic_owner`, `doctor`, `receptionist`, `patient`.
   - Keep permission enforcement at route level and service level.
   - Continue admin-managed role assignment and clinic assignment.

3. **Appointments**
   - Keep lifecycle: `pending -> confirmed -> completed / cancelled / no_show`.
   - Support patient booking and staff-created appointments.
   - Enforce clinic-hour, slot, and conflict validation.
   - Improve follow-up conversion from completed visit to invoice.

4. **Patient Module**
   - Patient profile, contact details, emergency contact, consent.
   - Appointment history and cancellation policy.
   - Future reminder support.

5. **Billing and Invoicing**
   - Service catalog per clinic.
   - Invoice create, edit, payment updates, printable receipt.
   - Stronger payment completion workflow and receipt finalization.

6. **Inventory**
   - Suppliers, stock items, purchase orders, receiving.
   - Alerting for low stock, expiry risk, and open purchase orders.

7. **Reports and Analytics**
   - Revenue, appointments, utilization, cancellations, clinic comparisons.
   - Expand toward more plan-aware analytics later.

8. **Production Readiness**
   - Logging, monitoring, rate limits, backups, CI, staging.

## Subscription Plans

### Goal
Turn `starter`, `pro`, and `premium` from simple clinic metadata into enforceable business tiers that control access, limits, and upgrade paths.

### Tier Positioning
- `starter`: small clinic basic operations
- `pro`: growing clinic with stronger operations and reporting
- `premium`: full clinic ERP with advanced scale and service options

### Feature Access by Tier
- `starter`
  - appointments
  - patient self-booking
  - billing and receipts
  - basic dashboard summaries
  - no advanced inventory workflows
  - no advanced reports package
- `pro`
  - everything in starter
  - inventory
  - reports
  - broader staff support
  - stronger clinic operations tooling
- `premium`
  - everything in pro
  - advanced analytics
  - reminders / messaging
  - higher limits
  - future enterprise or multi-site tooling

### Proposed Limits by Tier
- `starter`
  - 1 clinic
  - up to 5 staff users
  - capped monthly appointments
  - basic reporting only
- `pro`
  - up to 3 clinics
  - up to 20 staff users
  - higher monthly appointment cap
  - full reports and inventory
- `premium`
  - high or unlimited clinic count
  - high or unlimited staff count
  - high or unlimited appointments
  - advanced analytics and reminders

### Time-Based Subscription Model
Time-based subscription is important and should be planned now.

Add billing cycles:
- monthly
- quarterly
- annual

Add subscription fields on clinic or tenant subscription records:
- `planCode`
- `billingCycle`
- `startsAt`
- `endsAt`
- `status`
- `gracePeriodEndsAt`
- `autoRenew`

Expected subscription statuses:
- `trial`
- `active`
- `past_due`
- `grace_period`
- `expired`
- `cancelled`

Expected behaviors:
- active subscription -> full access according to plan
- past due -> warning state, no immediate data loss
- grace period -> limited time before enforcement
- expired -> block plan-restricted creation actions
- cancelled -> remain active until end date, then downgrade or expire

### Upgrade and Downgrade Rules
- allow upgrade immediately
- allow downgrade at cycle end by default
- if usage exceeds downgraded limits, keep existing data readable but block new over-limit creation
- premium-only features should become locked, not deleted

### Enforcement Strategy
- backend
  - enforce limits on create/update actions
  - enforce feature access by plan and subscription status
  - reject over-limit requests with clear upgrade messages
- frontend
  - show plan badges and subscription status
  - disable locked actions with clear explanation
  - show upgrade prompts on blocked workflows
- admin / owner UX
  - plan summary
  - renewal date
  - current usage vs plan limits

## Public Landing Page Plan
The product needs a public landing page for unauthenticated visitors.

### Purpose
- explain what the ERP does
- explain who it is for
- show plan tiers
- show time-based billing options
- send visitors to login or registration

### Public Landing Content
- hero section
- clinic operations summary
- role-based workflow highlights
- starter / pro / premium pricing cards
- monthly / quarterly / annual billing explanation
- CTA buttons for sign in and register

## API / Interface Additions
- `/api/admin/users`
- `/api/appointments`
- `/api/billing`
- `/api/inventory`
- `/api/reports`
- future subscription endpoints:
  - `/api/subscriptions/current`
  - `/api/subscriptions/usage`
  - `/api/subscriptions/change-plan`

## Test Plan
- role enforcement tests for every protected endpoint
- appointment conflict and reschedule rules
- billing calculations and invoice edits
- inventory stock updates and audit behavior
- subscription enforcement by tier
- expired subscription behavior
- upgrade / downgrade behavior
- public landing page visibility for unauthenticated users

## Assumptions
- clinics are the primary paying tenant
- patients are secondary self-service users
- MongoDB remains the main datastore
- payment gateway integration can come after internal subscription rules
- the first subscription version can be admin-managed before automated billing
