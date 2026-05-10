import { Badge, Button, Text } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleLabel: Record<string, string> = {
  admin: "Admin",
  clinic: "Clinic",
  clinic_owner: "Clinic Owner",
  doctor: "Doctor",
  receptionist: "Receptionist",
  patient: "Patient",
};

const TopNav = () => {
  const { user, logout } = useAuth();
  const role = user?.role ?? "unknown";
  const links =
    role === "admin"
      ? [
          { label: "Admin", to: "/admin" },
          { label: "Appointments", to: "/appointments" },
          { label: "Billing", to: "/billing" },
          { label: "Inventory", to: "/inventory" },
          { label: "Reports", to: "/reports" },
        ]
      : role === "clinic" || role === "clinic_owner"
        ? [
            { label: "Clinic", to: "/clinic" },
            { label: "Appointments", to: "/appointments" },
            { label: "Billing", to: "/billing" },
            { label: "Inventory", to: "/inventory" },
            { label: "Reports", to: "/reports" },
          ]
        : role === "doctor" || role === "receptionist"
          ? [
              { label: "Appointments", to: "/appointments" },
              { label: "Billing", to: "/billing" },
              { label: "Inventory", to: "/inventory" },
              { label: "Reports", to: "/reports" },
            ]
          : role === "patient"
            ? [
                { label: "Patient", to: "/patient" },
                { label: "Appointments", to: "/appointments" },
              ]
            : [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/60 bg-white/60 px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          EPR
        </div>
        <Text size="2" className="text-slate-600">
          Welcome {user?.name ?? "Guest"}
        </Text>
        {links.length > 0 ? (
          <div className="ml-2 flex flex-wrap items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full border border-emerald-100/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="soft" color="green">
          {roleLabel[role] ?? "User"}
        </Badge>
        <Button size="2" variant="soft" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default TopNav;
