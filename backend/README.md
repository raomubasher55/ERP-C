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

## Clinics (Authorization + role required)
Roles allowed:
- **Read-only**: `admin`, `clinic`, `patient`
- **Write** (create/update/delete): `clinic`, `admin`

Admin behavior:
- Admin can see all clinics.
- Admin can assign clinic ownership with `ownerUserId`.

Patient behavior:
- Patients can **list/get** clinics (read-only).
- Patients see **active** clinics only.

## Users (admin only)

### GET `/api/users`
List users. Optional filters:
- `role` = `admin | clinic | patient`
- `search` = name/email substring

Response `200`:
```json
{
  "users": [
    {
      "_id": "userId",
      "name": "Clinic User",
      "email": "clinic@example.com",
      "role": "clinic",
      "createdAt": "2026-03-25T00:00:00.000Z",
      "updatedAt": "2026-03-25T00:00:00.000Z"
    }
  ]
}
```

## Appointments (admin + clinic)

### POST `/api/appointments`
Create an appointment (clinic or admin).

Request body:
```json
{
  "clinicId": "clinicId",
  "patientName": "John Doe",
  "patientPhone": "+92-300-1234567",
  "scheduledAt": "2026-03-27T10:30:00.000Z",
  "status": "scheduled",
  "notes": "First visit"
}
```

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
    "status": "scheduled",
    "notes": "First visit",
    "createdAt": "2026-03-27T10:00:00.000Z",
    "updatedAt": "2026-03-27T10:00:00.000Z"
  }
}
```

### GET `/api/appointments`
List appointments (admin sees all, clinic sees own clinics).

Query params:
- `page`, `limit`
- `sortBy` = `scheduledAt | createdAt | status`
- `sortOrder` = `asc | desc`
- `clinicId`
- `status` = `scheduled | completed | cancelled | no_show`
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

### DELETE `/api/appointments/:id`
Delete appointment.

### GET `/api/appointments/today`
Count today’s appointments (status: scheduled + completed).

Response `200`:
```json
{
  "total": 5,
  "start": "2026-03-27T00:00:00.000Z",
  "end": "2026-03-27T23:59:59.999Z"
}
```

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
Delete a clinic (hard delete).

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
