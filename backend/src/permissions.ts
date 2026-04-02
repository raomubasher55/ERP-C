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
  | "users.manage";

const rolePermissions: Record<Role, Permission[] | ["*"]> = {
  admin: ["*"],
  clinic_owner: ["clinics.read", "clinics.manage", "appointments.read", "appointments.manage"],
  doctor: ["clinics.read", "appointments.read", "appointments.manage"],
  receptionist: ["clinics.read", "appointments.read", "appointments.manage"],
  patient: ["appointments.read", "appointments.book", "appointments.cancel"],
  clinic: ["clinics.read", "clinics.manage", "appointments.read", "appointments.manage"],
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
