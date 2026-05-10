# EPR Backend API

Base URL (local): `http://localhost:4000`

All requests that send JSON must include:

```
Content-Type: application/json
```

Authorization header format (for protected endpoints):

```
Authorization: Bearer <JWT>
```

## Auth

### POST `/api/auth/register`
Create a new user and return a token.

Request body:
```json
{
  "name": "Dr. Ayesha",
  "email": "ayesha@example.com",
  "password": "Passw0rd!"
}
```

Response `201`:
```json
{
  "token": "jwt...",
  "user": {
    "_id": "userId",
    "name": "Dr. Ayesha",
    "email": "ayesha@example.com",
    "role": "patient",
    "createdAt": "2026-03-25T00:00:00.000Z",
    "updatedAt": "2026-03-25T00:00:00.000Z"
  }
}
```

### POST `/api/auth/login`
Login and return a token.

Request body:
```json
{
  "email": "ayesha@example.com",
  "password": "Passw0rd!"
}
```

Response `200`: same as register.

### GET `/api/auth/me` (Authorization required)
Return the current user.

Headers:
```
Authorization: Bearer <JWT>
```

Response `200`:
```json
{
  "user": {
    "_id": "userId",
    "name": "Dr. Ayesha",
    "email": "ayesha@example.com",
    "role": "patient",
    "createdAt": "2026-03-25T00:00:00.000Z",
    "updatedAt": "2026-03-25T00:00:00.000Z"
  }
}
```

## Clinics (Authorization + permission required)
Roles allowed:
- **Read-only**: `admin`, `clinic_owner` (`clinic` legacy), `doctor`, `receptionist`
- **Write** (create/update/delete): `admin`, `clinic_owner` (`clinic` legacy)

Admin behavior:
- Admin can see all clinics.
- Admin can assign clinic ownership with `ownerUserId`.

Patient behavior:
- Patients use the public endpoint (`/api/clinics/public`) to see **active** clinics only.

### GET `/api/clinics/public`
Public list of active clinics (no auth required).

Response `200`:
```json
{ "clinics": [ { "...": "..." } ] }
```

## Users (admin only)

## Patient Profile (patient auth required)

### GET `/api/users/me/profile`
Return the authenticated patient's profile, contact information, and consent settings.

Response `200`:
```json
{
  "user": {
    "_id": "userId",
    "name": "Patient User",
    "email": "patient@example.com",
    "role": "patient",
    "patientProfile": {
      "dateOfBirth": "1998-05-10T00:00:00.000Z",
      "gender": "female"
    },
    "contact": {
      "phone": "+92-300-1234567",
      "address": "123 Main Street",
      "city": "Lahore",
      "emergencyContact": {
        "name": "Ali Khan",
        "phone": "+92-300-7654321",
        "relation": "Brother"
      }
    },
    "consent": {
      "treatment": true,
      "dataProcessing": true,
      "marketing": false,
      "smsReminders": true,
      "updatedAt": "2026-04-27T10:00:00.000Z"
    },
    "createdAt": "2026-03-25T00:00:00.000Z",
    "updatedAt": "2026-04-27T10:00:00.000Z"
  }
}
```

### PATCH `/api/users/me/profile`
Update the authenticated patient's profile.

Request body:
```json
{
  "name": "Patient User",
  "patientProfile": {
    "dateOfBirth": "1998-05-10",
    "gender": "female"
  },
  "contact": {
    "phone": "+92-300-1234567",
    "address": "123 Main Street",
    "city": "Lahore",
    "emergencyContact": {
      "name": "Ali Khan",
      "phone": "+92-300-7654321",
      "relation": "Brother"
    }
  },
  "consent": {
    "treatment": true,
    "dataProcessing": true,
    "marketing": false,
    "smsReminders": true
  }
}
```

Notes:
- Only authenticated users with role `patient` can access these endpoints.
- `dateOfBirth` must be `YYYY-MM-DD`.
- Saving consent updates `consent.updatedAt`.

Response `200`:
```json
{ "user": { "...": "..." } }
```

### GET `/api/users`
List users. Optional filters:
- `role` = `admin | clinic_owner | clinic | doctor | receptionist | patient`
- `search` = name/email substring

Response `200`:
```json
{
  "users": [
    {
      "_id": "userId",
      "name": "Clinic User",
      "email": "clinic@example.com",
      "role": "clinic_owner",
      "createdAt": "2026-03-25T00:00:00.000Z",
      "updatedAt": "2026-03-25T00:00:00.000Z"
    }
  ]
}
```

### PATCH `/api/users/:id/role`
Update a user role (admin only).

Request body:
```json
{ "role": "clinic_owner" }
```

Response `200`:
```json
{ "user": { "...": "..." } }
```

### PATCH `/api/users/:id/clinics`
Assign clinics to a staff user (admin only). Only needed for `doctor` and `receptionist`.

Request body:
```json
{ "clinicIds": ["clinicId1", "clinicId2"] }
```

Response `200`:
```json
{ "user": { "...": "..." } }
```

Notes:
- Only users with role `doctor` or `receptionist` can be assigned clinics.
- Assigning clinics to other roles returns `400`.

## Appointments (Authorization + permission required)
Roles allowed:
- **Read**: `admin`, `clinic_owner` (`clinic` legacy), `doctor`, `receptionist`, `patient`
- **Manage** (create/update/delete): `admin`, `clinic_owner` (`clinic` legacy), `doctor`, `receptionist`
- **Book / Cancel**: `patient`

Appointment status flow:
- Patient bookings are created as `pending`
- Staff bookings default to `confirmed`
- Valid staff transitions:
  - `pending -> confirmed`
  - `pending -> cancelled`
  - `confirmed -> completed`
  - `confirmed -> cancelled`
  - `confirmed -> no_show`
- Patient can cancel only own future `pending` or `confirmed` appointments

### POST `/api/appointments`
Create an appointment (clinic/admin/staff) or book as patient.

Request body:
```json
{
  "clinicId": "clinicId",
  "patientName": "John Doe",
  "patientPhone": "+92-300-1234567",
  "scheduledAt": "2026-03-27T10:30:00.000Z",
  "status": "confirmed",
  "notes": "First visit"
}
```

Booking rules:
- The clinic must be active
- The selected day must be in clinic `workingDays`
- The selected time must be inside clinic `startTime/endTime`
- The selected time must not fall inside `breakTime`
- The selected time must match `slotDuration`
- The selected slot must not already be booked

Response `201`:
```json
{
  "appointment": {
    "_id": "appointmentId",
    "clinicId": "clinicId",
    "createdByUserId": "userId",
    "patientName": "John Doe",
    "patientPhone": "+92-300-1234567",
    "scheduledAt": "2026-03-27T10:30:00.000Z",
    "status": "pending",
    "notes": "First visit",
    "createdAt": "2026-03-27T10:00:00.000Z",
    "updatedAt": "2026-03-27T10:00:00.000Z"
  }
}
```

### GET `/api/appointments`
List appointments (admin sees all, clinic sees own clinics, patient sees own).

Query params:
- `page`, `limit`
- `sortBy` = `scheduledAt | createdAt | status`
- `sortOrder` = `asc | desc`
- `clinicId`
- `status` = `pending | confirmed | completed | cancelled | no_show`
- `dateFrom`, `dateTo` (ISO datetime)

Response `200`:
```json
{
  "appointments": [ { "...": "..." } ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### GET `/api/appointments/:id`
Get a single appointment.

### PATCH `/api/appointments/:id`
Update appointment fields.

Notes:
- Staff can update status according to the transition rules above
- Rescheduling is only allowed while appointment status is active (`pending` or `confirmed`)
- Rescheduling runs the same clinic-hours and conflict checks as booking

### PATCH `/api/appointments/:id/prescriptions`
Replace the appointment's prescription-only medicine list.

Request body:
```json
{
  "prescriptions": [
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "5 days",
      "notes": "Buy outside the clinic if preferred"
    }
  ]
}
```

Notes:
- Staff only
- Prescription-only medicines are not billed
- Prescription-only medicines do not affect stock or reports

### DELETE `/api/appointments/:id`
Delete appointment.

### GET `/api/appointments/today`
Count today's appointments (status: pending + confirmed + completed).

Response `200`:
```json
{
  "total": 5,
  "start": "2026-03-27T00:00:00.000Z",
  "end": "2026-03-27T23:59:59.999Z"
}
```

### GET `/api/appointments/slots`
Get booked slots for a clinic on a date (no patient details).

Query params:
- `clinicId` (required)
- `date` (YYYY-MM-DD)

Response `200`:
```json
{ "slots": ["2026-04-01T09:00:00.000Z", "2026-04-01T09:15:00.000Z"] }
```

Notes:
- The backend keeps a short in-memory cache for slot responses per clinic/day.
- Cache is invalidated when appointments are created, updated, or deleted.

## Billing (Authorization + permission required)
Roles allowed:
- **Services read**: `admin`, `clinic_owner` (`clinic` legacy), `doctor`, `receptionist`
- **Services manage**: `admin`, `clinic_owner` (`clinic` legacy)
- **Invoices read**: `admin`, `clinic_owner` (`clinic` legacy), `doctor`, `receptionist`, `patient`
- **Invoices manage**: `admin`, `clinic_owner` (`clinic` legacy), `doctor`, `receptionist`

Payment status flow:
- `unpaid`
- `partial`
- `paid`

Backend billing rules:
- Services belong to one clinic
- Invoices are tied to one appointment
- Only one active invoice is allowed per appointment
- Receipt number is generated on invoice creation
- Invoice totals are recalculated on update
- Invoice billable lines can be `service` or `dispensed_medicine`
- Clinic-store medicines are billed immediately, but stock reduces only after explicit dispense
- Dispensed medicine lines are locked and cannot be removed or edited
- Invoices containing dispensed medicine lines cannot be deleted
- Patient can read only own invoices
- The frontend provides a printable receipt page and browser PDF export via print

### GET `/api/billing/services`
List billing services for accessible clinics.

Query params:
- `clinicId`
- `search`
- `isActive`
- `page`, `limit`

### POST `/api/billing/services`
Create a service catalog item.

Request body:
```json
{
  "clinicId": "clinicId",
  "name": "Consultation Fee",
  "code": "CONSULT",
  "description": "Standard visit charge",
  "price": 2000,
  "isActive": true
}
```

### PATCH `/api/billing/services/:id`
Update a service catalog item.

### DELETE `/api/billing/services/:id`
Soft-delete a service catalog item.

### GET `/api/billing/invoices`
List invoices for accessible clinics or the authenticated patient.

Query params:
- `clinicId`
- `appointmentId`
- `paymentStatus = unpaid | partial | paid`
- `page`, `limit`

### GET `/api/billing/invoices/:id`
Get one invoice by id.

### POST `/api/billing/invoices`
Create an invoice for one appointment.

Request body:
```json
{
  "clinicId": "clinicId",
  "appointmentId": "appointmentId",
  "items": [
    { "type": "service", "serviceId": "serviceId", "quantity": 1 },
    {
      "type": "dispensed_medicine",
      "inventoryItemId": "inventoryItemId",
      "quantity": 2,
      "unitPrice": 350
    }
  ],
  "discount": 200,
  "notes": "Front desk invoice"
}
```

Response `201`:
```json
{
  "invoice": {
    "_id": "invoiceId",
    "clinicId": "clinicId",
    "appointmentId": "appointmentId",
    "patientName": "Patient User",
    "items": [
      {
        "lineId": "LINE-ABC",
        "type": "service",
        "serviceId": "serviceId",
        "displayName": "Consultation Fee",
        "quantity": 1,
        "unitPrice": 2000,
        "lineTotal": 2000
      },
      {
        "lineId": "LINE-DEF",
        "type": "dispensed_medicine",
        "inventoryItemId": "inventoryItemId",
        "displayName": "Paracetamol",
        "quantity": 2,
        "unitPrice": 350,
        "lineTotal": 700,
        "dispenseStatus": "pending"
      }
    ],
    "subtotal": 2700,
    "discount": 200,
    "total": 2500,
    "paidAmount": 0,
    "paymentStatus": "unpaid",
    "receiptNumber": "INV-ABC123-123456",
    "issuedAt": "2026-04-27T10:00:00.000Z"
  }
}
```

### PATCH `/api/billing/invoices/:id`
Update invoice items, discount, notes, or `paidAmount`.

Request body example:
```json
{
  "paidAmount": 1800,
  "notes": "Paid in cash"
}
```

### PATCH `/api/billing/invoices/:id/dispense`
Mark one or more clinic-store medicine lines as dispensed and decrement inventory stock.

Request body:
```json
{
  "lineIds": ["LINE-DEF"]
}
```

Notes:
- Only `dispensed_medicine` lines can be marked dispensed
- Stock must be available at dispense time or the API returns `409`
- Each line can be dispensed only once

### DELETE `/api/billing/invoices/:id`
Soft-delete an invoice.

Notes:
- Invoices with already-dispensed medicine lines cannot be deleted

## Inventory (Authorization + permission required)
Roles allowed:
- **Read**: `admin`, `clinic_owner` (`clinic` legacy), `doctor`, `receptionist`
- **Manage**: `admin`, `clinic_owner` (`clinic` legacy), `receptionist`

Backend inventory rules:
- Suppliers, stock items, and purchase orders belong to one clinic
- Doctors can read inventory for assigned clinics but cannot modify it
- Receptionists can manage inventory for assigned clinics
- Marking a purchase order as `received` increments stock automatically
- Suppliers, inventory items, and purchase orders use soft-delete

### GET `/api/inventory/alerts`
Get alert widgets for one clinic.

Query params:
- `clinicId` (required for non-admin)
- `daysToExpiry` (optional, default 30)

Response `200`:
```json
{
  "lowStockItems": [{ "...": "..." }],
  "expiringItems": [{ "...": "..." }],
  "openPurchaseOrders": [{ "...": "..." }]
}
```

### GET `/api/inventory/suppliers`
List suppliers for accessible clinics.

Query params:
- `clinicId`
- `search`
- `isActive`
- `page`, `limit`

### POST `/api/inventory/suppliers`
Create a supplier.

Request body:
```json
{
  "clinicId": "clinicId",
  "name": "MediSource Pharma",
  "contactPerson": "Ali Raza",
  "phone": "+92-300-1111111",
  "email": "orders@medisource.pk",
  "address": "Lahore"
}
```

### PATCH `/api/inventory/suppliers/:id`
Update a supplier.

### DELETE `/api/inventory/suppliers/:id`
Soft-delete a supplier.

### GET `/api/inventory/items`
List stock items for accessible clinics.

Query params:
- `clinicId`
- `search`
- `lowStockOnly`
- `expiringInDays`
- `isActive`
- `page`, `limit`

### POST `/api/inventory/items`
Create a stock item.

Request body:
```json
{
  "clinicId": "clinicId",
  "supplierId": "supplierId",
  "name": "Paracetamol 500mg",
  "sku": "PCM-500",
  "category": "Tablet",
  "unit": "box",
  "currentStock": 20,
  "minStockLevel": 10,
  "purchasePrice": 1200,
  "salePrice": 1500,
  "expiryDate": "2026-12-31T00:00:00.000Z"
}
```

### PATCH `/api/inventory/items/:id`
Update a stock item.

### DELETE `/api/inventory/items/:id`
Soft-delete a stock item.

### GET `/api/inventory/purchase-orders`
List purchase orders for accessible clinics.

Query params:
- `clinicId`
- `supplierId`
- `status = pending | received | cancelled`
- `page`, `limit`

### GET `/api/inventory/purchase-orders/:id`
Get one purchase order.

### POST `/api/inventory/purchase-orders`
Create a purchase order.

Request body:
```json
{
  "clinicId": "clinicId",
  "supplierId": "supplierId",
  "status": "pending",
  "notes": "Monthly refill",
  "items": [
    {
      "inventoryItemId": "itemId",
      "quantity": 10,
      "costPrice": 1100,
      "expiryDate": "2026-12-31T00:00:00.000Z"
    }
  ]
}
```

Response `201`:
```json
{
  "purchaseOrder": {
    "_id": "purchaseOrderId",
    "clinicId": "clinicId",
    "supplierId": "supplierId",
    "orderNumber": "PO-ABC123-123456",
    "status": "pending",
    "items": [
      {
        "inventoryItemId": "itemId",
        "itemName": "Paracetamol 500mg",
        "quantity": 10,
        "costPrice": 1100,
        "lineTotal": 11000
      }
    ],
    "totalAmount": 11000
  }
}
```

### PATCH `/api/inventory/purchase-orders/:id`
Update a purchase order.

Notes:
- Pending orders can be marked `received` or `cancelled`
- Received or cancelled orders cannot be changed again
- Changing status to `received` adds the ordered quantity to current stock

### DELETE `/api/inventory/purchase-orders/:id`
Soft-delete a purchase order.

### POST `/api/clinics`
Create a clinic.

Headers:
```
Authorization: Bearer <JWT>
```

Request body:
```json
{
  "ownerUserId": "clinicUserId (admin only)",
  "name": "City Care Clinic",
  "phone": "+92-300-1234567",
  "email": "clinic@example.com",
  "address": "1 Main Road",
  "city": "Lahore",
  "ownerName": "Dr. Ayesha",
  "subscriptionPlan": "starter",
  "workingDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "startTime": "10:00",
  "endTime": "17:00",
  "slotDuration": 15,
  "breakTime": { "start": "13:00", "end": "14:00" },
  "features": { "whatsappReminder": false, "onlineBooking": false },
  "isActive": true
}
```

Response `201`:
```json
{
  "clinic": {
    "_id": "clinicId",
    "ownerUserId": "userId",
    "appointments": 0,
    "name": "City Care Clinic",
    "phone": "+92-300-1234567",
    "email": "clinic@example.com",
    "address": "1 Main Road",
    "city": "Lahore",
    "ownerName": "Dr. Ayesha",
    "subscriptionPlan": "starter",
    "workingDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "startTime": "10:00",
    "endTime": "17:00",
    "slotDuration": 15,
    "breakTime": { "start": "13:00", "end": "14:00" },
    "features": { "whatsappReminder": false, "onlineBooking": false },
    "isActive": true,
    "createdAt": "2026-03-25T00:00:00.000Z",
    "updatedAt": "2026-03-25T00:00:00.000Z"
  }
}
```

### GET `/api/clinics`
List clinics for the authenticated user (paged).

Query params:
- `page` (default 1)
- `limit` (default 20, max 100)
- `search` (matches name/phone/email)
- `city`
- `isActive` (`true` or `false`)

Response `200`:
```json
{
  "clinics": [ { "...": "..." } ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### GET `/api/clinics/:id`
Get a single clinic by id.

Response `200`:
```json
{ "clinic": { "...": "..." } }
```

### PATCH `/api/clinics/:id`
Update a clinic. Only the listed fields are accepted:
`name`, `phone`, `email`, `address`, `city`, `ownerName`, `subscriptionPlan`,
`workingDays`, `startTime`, `endTime`, `slotDuration`, `breakTime`, `features`, `isActive`.

Request body (example):
```json
{
  "phone": "+92-300-7654321",
  "subscriptionPlan": "pro"
}
```

Response `200`:
```json
{ "clinic": { "...": "..." } }
```

### DELETE `/api/clinics/:id`
Soft-delete a clinic.

Response `200`:
```json
{ "clinic": { "...": "..." } }
```

## Errors

### Validation errors (Zod)
Status: `400`
```json
{
  "message": "Validation error",
  "errors": [
    { "path": "email", "message": "email must be valid" }
  ]
}
```

### Unauthorized
Status: `401`
```json
{ "message": "Unauthorized" }
```

### Not found
Status: `404`
```json
{ "message": "Clinic not found" }
```

### Server errors
Status: `500`
```json
{ "message": "Internal Server Error" }
```

## Environment

Required `.env` values (see `backend/.env.example`):
- `MONGODB_URI`
- `JWT_SECRET`

Optional:
- `PORT` (default 4000)
- `CORS_ORIGIN`
- `JWT_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS`

## Quick test (cURL)

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Ayesha","email":"ayesha@example.com","password":"Passw0rd!"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ayesha@example.com","password":"Passw0rd!"}'
```
