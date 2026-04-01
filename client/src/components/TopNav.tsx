import { Badge, Button, Text } from "@radix-ui/themes";
import { useAuth } from "../context/AuthContext";

const roleLabel: Record<string, string> = {
  admin: "Admin",
  clinic: "Clinic",
  patient: "Patient",
};

const TopNav = () => {
  const { user, logout } = useAuth();
  const role = user?.role ?? "unknown";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/60 bg-white/60 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          EPR
        </div>
        <Text size="2" className="text-slate-600">
          Welcome {user?.name ?? "Guest"}
        </Text>
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
