export type Role =
  | "admin"
  | "clinic_owner"
  | "doctor"
  | "receptionist"
  | "patient"
  | "clinic";

export type Permission =
  | "clinics.read"
  | "clinics.manage"
  | "appointments.read"
  | "appointments.manage"
  | "appointments.book"
  | "appointments.cancel"
  | "billing.read"
  | "billing.manage"
  | "inventory.read"
  | "inventory.manage"
  | "reports.read"
  | "users.manage";

const rolePermissions: Record<Role, ReadonlyArray<Permission | "*">> = {
  admin: ["*"],
  clinic_owner: [
    "clinics.read",
    "clinics.manage",
    "appointments.read",
    "appointments.manage",
    "billing.read",
    "billing.manage",
    "inventory.read",
    "inventory.manage",
    "reports.read",
  ],
  doctor: [
    "clinics.read",
    "appointments.read",
    "appointments.manage",
    "billing.read",
    "billing.manage",
    "inventory.read",
    "reports.read",
  ],
  receptionist: [
    "clinics.read",
    "appointments.read",
    "appointments.manage",
    "billing.read",
    "billing.manage",
    "inventory.read",
    "inventory.manage",
    "reports.read",
  ],
  patient: ["appointments.read", "appointments.book", "appointments.cancel", "billing.read"],
  clinic: [
    "clinics.read",
    "clinics.manage",
    "appointments.read",
    "appointments.manage",
    "billing.read",
    "billing.manage",
    "inventory.read",
    "inventory.manage",
    "reports.read",
  ],
};

export const normalizeRole = (role: Role) =>
  role === "clinic" ? "clinic_owner" : role;

export const hasPermission = (role: Role, permission: Permission) => {
  const normalized = normalizeRole(role);
  const perms = rolePermissions[normalized];
  if (!perms) return false;
  if (perms.includes("*")) return true;
  return perms.includes(permission);
};
