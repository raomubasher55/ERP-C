# ERP Workflow

This document explains how the current ERP system works from login to day-to-day usage for each role.

## Roles

The system currently supports these roles:

- `admin`
- `clinic_owner`
- `doctor`
- `receptionist`
- `patient`

There is also a legacy role:

- `clinic`

The backend treats `clinic` like `clinic_owner`.

## Seeded Default Users

When the backend seed script is run, these default accounts are created:

- `admin@epr.local` / `Passw0rd!` -> `admin`
- `owner@epr.local` / `Passw0rd!` -> `clinic_owner`
- `owner2@epr.local` / `Passw0rd!` -> `clinic_owner`
- `owner3@epr.local` / `Passw0rd!` -> `clinic_owner`
- `doctor@epr.local` / `Passw0rd!` -> `doctor`
- `doctor2@epr.local` / `Passw0rd!` -> `doctor`
- `doctor3@epr.local` / `Passw0rd!` -> `doctor`
- `reception@epr.local` / `Passw0rd!` -> `receptionist`
- `reception2@epr.local` / `Passw0rd!` -> `receptionist`
- `reception3@epr.local` / `Passw0rd!` -> `receptionist`
- `patient@epr.local` / `Passw0rd!` -> `patient`
- `patient2@epr.local` / `Passw0rd!` -> `patient`
- `legacy-clinic@epr.local` / `Passw0rd!` -> legacy `clinic`

The seed also creates:

- three active clinics: `City Care Clinic`, `North Star Clinic`, and `Family Health Hub`
- multiple doctor assignments across clinics
- one receptionist assignment per clinic
- starter billing services for each clinic
- one supplier and one inventory item per clinic

## Authentication Flow

1. User registers or logs in.
2. Backend validates credentials and returns a JWT token.
3. Frontend stores the token and loads `/api/auth/me`.
4. Frontend routes the user to the correct workspace based on role:
   - `admin` -> admin dashboard
   - `clinic_owner` or `clinic` -> clinic dashboard
   - `doctor` or `receptionist` -> appointments page
   - `patient` -> patient dashboard

## Permission Model

Current permissions:

- `clinics.read`
- `clinics.manage`
- `appointments.read`
- `appointments.manage`
- `appointments.book`
- `appointments.cancel`
- `billing.read`
- `billing.manage`
- `inventory.read`
- `inventory.manage`
- `reports.read`
- `users.manage`

Role behavior:

- `admin`
  - full access to all clinics, appointments, and users
- `clinic_owner`
  - can read and manage only owned clinics
  - can read and manage appointments for owned clinics
  - can manage billing services and invoices for owned clinics
  - can read and manage inventory, suppliers, and purchase orders for owned clinics
  - can read reports for owned clinics
- `doctor`
  - can read clinics assigned through `clinicIds`
  - can read and manage appointments for assigned clinics
  - can read and manage invoices for assigned clinics
  - can read inventory for assigned clinics
  - can read reports for assigned clinics
  - cannot manage clinics
- `receptionist`
  - can read clinics assigned through `clinicIds`
  - can read and manage appointments for assigned clinics
  - can read and manage invoices for assigned clinics
  - can read and manage inventory for assigned clinics
  - can read reports for assigned clinics
  - cannot manage clinics
- `patient`
  - can see public active clinics
  - can maintain own patient profile
  - can maintain own contact and emergency contact details
  - can record consent preferences
  - can book appointments
  - can read only own appointments
  - can read only own invoices
  - can cancel only own future pending or confirmed appointments

## Admin Flow

1. Admin logs in.
2. Admin lands on the admin dashboard.
3. Admin can create a clinic.
4. Admin can assign or reassign a clinic owner.
5. Admin can open the users section.
6. Admin can:
   - search users
   - filter users by role
   - update user roles
   - assign clinics to doctors and receptionists
7. Admin can open the appointments page and see all appointments across clinics.
8. Admin can open the appointment details page and update appointment status.
9. Admin can open the reports page and review all-clinic performance.

## Clinic Owner Flow

1. Clinic owner logs in.
2. Clinic owner lands on the clinic dashboard.
3. Backend limits clinic data by `ownerUserId`.
4. Clinic owner sees:
   - owned clinics
   - active clinic count
   - today appointment count
   - today slot usage
5. Clinic owner can:
   - create clinic records
   - edit clinic records
   - delete clinics with soft-delete behavior
6. Clinic owner can open the appointments page.
7. Clinic owner sees only appointments for owned clinics.
8. Clinic owner can:
   - open appointment details
   - edit appointment status
   - mark completed
   - mark no-show
   - cancel appointments
9. Clinic owner can open the reports page and review owned clinic revenue, utilization, and cancellation trends.

## Doctor Flow

1. Admin creates a doctor user or changes a user role to `doctor`.
2. Admin assigns one or more clinics to that doctor using `clinicIds`.
3. Doctor logs in.
4. Doctor is routed to the appointments workspace.
5. Backend limits clinic and appointment access to assigned clinics only.
6. Doctor can:
   - view clinics assigned to them
   - view appointments for assigned clinics
   - open appointment details
   - update appointment status
   - open read-only reports for assigned clinics
7. Doctor cannot:
   - create clinics
   - edit clinics
   - manage users

## Receptionist Flow

1. Admin creates a receptionist user or changes a user role to `receptionist`.
2. Admin assigns one or more clinics to that receptionist using `clinicIds`.
3. Receptionist logs in.
4. Receptionist is routed to the appointments workspace.
5. Backend limits clinic and appointment access to assigned clinics only.
6. Receptionist can:
   - review bookings
   - update appointment status
   - open appointment details
   - open read-only reports for assigned clinics
7. Receptionist cannot:
   - manage clinics
   - manage users

## Patient Flow

1. Patient registers or logs in.
2. Patient lands on the patient dashboard.
3. Patient can review and update:
   - personal profile
   - contact details
   - emergency contact
   - consent preferences
4. Backend stores patient profile under the authenticated patient user.
5. Patient sees active clinics from `/api/clinics/public`.
6. Patient selects a clinic and opens the booking modal.
7. Patient selects:
   - patient name
   - phone
   - date
   - time slot
   - optional notes
8. Frontend checks booked slots for that clinic/date.
9. Backend validates:
   - clinic is active
   - selected day is in clinic working days
   - selected time is inside clinic hours
   - selected time is not inside clinic break time
   - selected time matches the clinic slot duration
   - selected slot is not already booked
10. Backend creates the appointment with:
   - `clinicId`
   - `createdByUserId`
   - `patientName`
   - `patientPhone`
   - `scheduledAt`
   - `status = pending`
11. Patient sees the booking in appointment history.
12. Patient can open the appointment details page.
13. Patient can cancel only if:
    - the appointment belongs to that patient
    - status is `pending` or `confirmed`
    - the appointment is still upcoming
14. Clinic staff later confirms or closes the appointment through the appointment workflow.
15. Clinic staff can create an invoice for the visit from the appointment details page.

## Appointment Flow

1. Patient books an appointment for a clinic.
2. Backend checks clinic availability and slot conflict.
3. New patient appointments start as `pending`.
4. Staff-created appointments default to `confirmed`.
5. Appointment is stored in MongoDB.
6. Clinic appointment count for today is refreshed.
7. Authorized clinic users can view that appointment.
8. Staff users can move appointments through this flow:
   - `pending -> confirmed`
   - `pending -> cancelled`
   - `confirmed -> completed`
   - `confirmed -> cancelled`
   - `confirmed -> no_show`
9. Rescheduling is only allowed while the appointment is active.
10. Booked slot lookups are cached briefly per clinic/day and invalidated on appointment changes.
11. The appointment details page shows:
   - patient details
   - clinic details
   - scheduled time
   - status
   - invoice summary when available
   - prescription-only medicines when recorded
   - notes
   - created and updated timestamps

## Billing Flow

1. Clinic owner or admin configures a clinic service catalog.
2. Services belong to one clinic and carry a name, optional code, description, and price.
3. After or during a visit, clinic staff opens the appointment details page.
4. Staff manages two medicine paths:
   - clinic-store medicines -> billable invoice lines
   - external/non-clinic purchase medicines -> prescription-only lines
5. Staff creates one invoice for that appointment from selected service items and selected clinic-store medicines.
6. Backend snapshots:
   - patient name
   - patient phone
   - appointment time
   - service names and prices
   - clinic-store medicine names and prices
7. Backend generates a receipt number for the invoice.
8. Invoice totals are calculated as:
   - `subtotal = sum(line totals)`
   - `total = subtotal - discount`
9. Clinic-store medicines are billed immediately, but stock does not change yet.
10. Staff must explicitly mark clinic-store medicine lines as `dispensed`.
11. On dispense:
   - stock decreases
   - line locks
   - medicine analytics start counting that line
12. Prescription-only lines:
   - stay outside invoice totals
   - do not reduce stock
   - do not affect medicine revenue
13. Payment collection updates `paidAmount` and derives:
   - `unpaid`
   - `partial`
   - `paid`
14. The billing page and appointment details page link to a printable receipt view.
15. The receipt view supports browser print and Save as PDF.
16. Patients can read only invoices linked to their own appointments.
17. Admin, clinic owners, doctors, and receptionists can read invoices within their clinic scope.

## Reports Flow

1. Admin, clinic owner, doctor, or receptionist opens the reports page.
2. Backend scopes report data to all clinics, owned clinics, or assigned clinics based on role.
3. User can filter by:
   - today
   - last 7 days
   - last 30 days
   - custom date range
4. Reports show:
   - invoiced revenue
   - dispensed medicine revenue
   - dispensed medicine units
   - appointment total
   - utilization rate
   - cancellation rate
   - appointment status breakdown
   - revenue trend
   - appointment trend
   - clinic performance table when more than one clinic is accessible
   - top dispensed medicines
5. Dashboard summary cards also show a short analytics snapshot for non-patient operational roles.

## Inventory Flow

1. Admin, clinic owner, or receptionist opens the inventory page.
2. Frontend loads clinics available to the current user.
3. User selects one clinic workspace.
4. Backend scopes inventory reads and writes to that clinic.
5. User can manage:
   - suppliers
   - stock items
   - purchase orders
6. Supplier records store vendor contact information for future orders.
7. Inventory item records store:
   - item name
   - supplier link
   - SKU
   - category
   - unit
   - current stock
   - minimum stock level
   - purchase price
   - optional sale price
   - optional expiry date
8. Alerts panel shows:
   - low-stock items
   - items expiring soon
   - pending purchase orders
9. Purchase orders are created against one supplier and one clinic.
10. Each purchase order stores item lines with quantity, cost price, and optional expiry date.
11. When a purchase order is marked `received`, backend increases stock quantities automatically.
12. Doctors can open the inventory page in read-only mode for assigned clinics.
13. Patients do not have access to any inventory route or page.

## Clinic Visibility Rules

- `admin`
  - sees all clinics
- `clinic_owner`
  - sees only clinics owned by that user
- `doctor` and `receptionist`
  - see only clinics assigned through `clinicIds`
- `patient`
  - uses the public clinics endpoint and only sees active clinics

## Appointment Visibility Rules

- `admin`
  - sees all appointments
- `clinic_owner`
  - sees appointments for owned clinics
- `doctor` and `receptionist`
  - see appointments for assigned clinics
- `patient`
  - sees only appointments where `createdByUserId` is their own user id

## Current Frontend Pages

- Admin dashboard
  - clinic management
  - user role and clinic assignment management
- Clinic dashboard
  - owned clinic summary
  - today slots and appointment count
- Billing page
  - service catalog
  - invoice list
  - payment updates
- Inventory page
  - supplier management
  - stock item management
  - low-stock and expiry alerts
  - purchase order receiving
- Reports page
  - KPI cards
  - trend charts
  - clinic performance analytics
- Patient dashboard
  - profile, contact, and consent form
  - public clinics list
  - booking modal
  - patient appointment history
- Appointments page
  - filtered appointment list
  - appointment editing for staff
- Appointment details page
  - available to all authenticated roles with permission to access that appointment

## Important Current Rules

- Changing a user away from `doctor` or `receptionist` clears assigned `clinicIds`.
- Only `doctor` and `receptionist` can receive clinic assignments.
- Soft delete is used for clinics and appointments.
- Soft delete is also used for suppliers, stock items, and purchase orders.
- Clinic dashboard is focused on today's activity.
- Patient cannot access clinic management routes.
- Patient profile endpoints are restricted to the authenticated patient only.
- Legacy `scheduled` appointment data is treated as `confirmed` in API responses.
- Reports are available only to admin, clinic owner, doctor, and receptionist.
- Reports use invoiced total for revenue calculations in the selected date range.

## Summary

The current software works as a role-based clinic ERP:

- Admin manages the platform
- Clinic owner manages owned clinic records
- Doctor and receptionist operate appointments for assigned clinics
- Admin, clinic owner, doctor, and receptionist can review role-scoped reports
- Patient discovers clinics, books appointments, and tracks personal bookings
