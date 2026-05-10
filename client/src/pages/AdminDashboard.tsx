import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Heading,
  Select,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Clinic, User } from "../types/api";
import ClinicModal from "../components/ClinicModal";
import ReportsSummaryCards from "../components/ReportsSummaryCards";
import TopNav from "../components/TopNav";

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | User["role"]>("all");
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [selectedClinics, setSelectedClinics] = useState<string[]>([]);

  const loadClinics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ clinics: Clinic[]; total: number }>("/api/clinics", token);
      setClinics(res.clinics);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to load clinics";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadClinics();
    }
  }, [token, loadClinics]);

  useEffect(() => {
    const loadToday = async () => {
      if (!token) return;
      try {
        const res = await api.get<{ total: number }>("/api/appointments/today", token);
        setTodayCount(res.total);
      } catch {
        setTodayCount(0);
      }
    };
    loadToday();
  }, [token, loadClinics]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const totals = useMemo(() => {
    const active = clinics.filter((c) => c.isActive).length;
    return { active, todayAppointments: todayCount, total: clinics.length };
  }, [clinics, todayCount]);

  const clinicsById = useMemo(
    () => new Map(clinics.map((clinic) => [clinic._id, clinic])),
    [clinics]
  );

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      const path = params.toString() ? `/api/users?${params}` : "/api/users";
      const res = await api.get<{ users: User[] }>(path, token);
      setUsers(res.users);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to load users";
      setUsersError(message);
    } finally {
      setUsersLoading(false);
    }
  }, [token, debouncedSearch, roleFilter]);

  useEffect(() => {
    if (token) {
      loadUsers();
    }
  }, [token, loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateUserRole = async (userId: string, role: User["role"]) => {
    if (!token) return;
    try {
      const res = await api.patch<{ user: User }>(
        `/api/users/${userId}/role`,
        { role },
        token
      );
      setUsers((prev) => prev.map((u) => (u._id === userId ? res.user : u)));
      setToast({ message: "User role updated", type: "success" });
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to update role";
      setToast({ message, type: "error" });
    }
  };

  const updateUserClinics = async (userId: string, clinicIds: string[]) => {
    if (!token) return;
    try {
      const res = await api.patch<{ user: User }>(
        `/api/users/${userId}/clinics`,
        { clinicIds },
        token
      );
      setUsers((prev) => prev.map((u) => (u._id === userId ? res.user : u)));
      setToast({ message: "Clinic access updated", type: "success" });
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to update clinics";
      setToast({ message, type: "error" });
    }
  };

  const openAssignModal = (target: User) => {
    setAssigningUser(target);
    setSelectedClinics(target.clinicIds ?? []);
  };

  const toggleClinicSelection = (clinicId: string) => {
    setSelectedClinics((prev) =>
      prev.includes(clinicId) ? prev.filter((id) => id !== clinicId) : [...prev, clinicId]
    );
  };

  const saveAssignedClinics = async () => {
    if (!assigningUser) return;
    await updateUserClinics(assigningUser._id, selectedClinics);
    setAssigningUser(null);
  };

  const getRoleBadgeColor = (role: User["role"]) => {
    switch (role) {
      case "admin":
        return "ruby";
      case "clinic_owner":
      case "clinic":
        return "green";
      case "doctor":
        return "blue";
      case "receptionist":
        return "amber";
      case "patient":
      default:
        return "gray";
    }
  };

  const getRoleLabel = (role: User["role"]) => {
    switch (role) {
      case "clinic_owner":
        return "Clinic owner";
      case "receptionist":
        return "Receptionist";
      case "doctor":
        return "Doctor";
      case "patient":
        return "Patient";
      case "admin":
        return "Admin";
      case "clinic":
        return "Clinic (legacy)";
      default:
        return role;
    }
  };

  const formatUpdatedAt = (value: string) =>
    new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));

  const getPlanBadgeColor = (plan: Clinic["subscriptionPlan"]) => {
    switch (plan) {
      case "premium":
        return "violet";
      case "pro":
        return "blue";
      case "starter":
      default:
        return "gray";
    }
  };

  return (
    <div className="min-h-screen bg-app-gradient text-slate-950">
      <TopNav />
      {toast ? (
        <div
          className={`fixed right-6 top-6 z-50 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {token ? (
        <ClinicModal
          open={isModalOpen || !!editingClinic}
          mode={editingClinic ? "edit" : "create"}
          clinic={editingClinic}
          token={token}
          userRole={user?.role}
          onClose={() => {
            setIsModalOpen(false);
            setEditingClinic(null);
          }}
          onSaved={() => {
            if (editingClinic) {
              setEditingClinic(null);
              setToast({ message: "Clinic updated", type: "success" });
            } else {
              setIsModalOpen(false);
              setToast({ message: "Clinic created", type: "success" });
            }
            loadClinics();
          }}
          onError={(message) => setToast({ message, type: "error" })}
        />
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Admin Dashboard
            </Text>
            <Heading size="8" className="font-display">
              {user ? `Welcome, ${user.name}` : "Admin Workspace"}
            </Heading>
            <Text size="3" className="text-slate-500">
              Manage all clinics and assign owners across the system.
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button size="3" variant="solid" onClick={() => setIsModalOpen(true)}>
              New Clinic
            </Button>
            <Button asChild size="3" variant="soft">
              <Link to="/inventory">Inventory</Link>
            </Button>
            <Button asChild size="3" variant="soft">
              <Link to="/billing">Billing</Link>
            </Button>
            <Button asChild size="3" variant="soft">
              <Link to="/appointments">Appointments</Link>
            </Button>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { label: "Total clinics", value: totals.total },
            { label: "Active clinics", value: totals.active },
            { label: "Appointments today", value: totals.todayAppointments },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,118,110,0.08)]"
            >
              <Text size="2" className="text-slate-500">
                {stat.label}
              </Text>
              <Heading size="8" className="font-display text-slate-900">
                {stat.value}
              </Heading>
            </Card>
          ))}
        </section>

        {token ? <ReportsSummaryCards token={token} preset="7d" title="Performance snapshot" /> : null}

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <Heading size="6" className="font-display">
              Clinics
            </Heading>
            <Text size="2" className="text-slate-500">
              Showing {clinics.length} clinics
            </Text>
          </div>

          <div className="mt-4 grid gap-4">
            {loading ? (
              <Card className="border border-slate-200 bg-white/70 p-6">
                <Text size="2" className="text-slate-500">
                  Loading clinics...
                </Text>
              </Card>
            ) : null}

            {error ? (
              <Card className="border border-red-200 bg-red-50 p-6">
                <Text size="2" className="text-red-600">
                  {error}
                </Text>
              </Card>
            ) : null}

            {!loading && !error && clinics.length === 0 ? (
              <Card className="border border-slate-200 bg-white/70 p-6">
                <Text size="2" className="text-slate-500">
                  No clinics yet. Create your first clinic to get started.
                </Text>
              </Card>
            ) : null}

            {!loading &&
              !error &&
              (
                <Card className="overflow-hidden border border-slate-200 bg-white/90 p-0 shadow-[0_18px_40px_rgba(15,118,110,0.08)]">
                  <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(240,253,250,0.9),rgba(248,250,252,0.95))] px-4 py-4">
                    <div className="flex flex-col gap-4 lg:items-end">
                      <div className="max-w-2xl text-right lg:self-end">
                        <Text size="1" className="uppercase tracking-[0.24em] text-emerald-600">
                          Clinic Operations
                        </Text>
                        <Heading size="5" className="mt-1 font-display text-slate-900">
                          Clinic directory
                        </Heading>
                        <Text size="2" className="mt-1 text-slate-600">
                          Review activity, hours, and status in one scrollable grid.
                        </Text>
                      </div>

                      <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[380px]">
                        <div className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 shadow-sm">
                          <Text size="1" className="uppercase tracking-[0.18em] text-emerald-600">
                            Active clinics
                          </Text>
                          <div className="mt-1 flex items-end gap-2">
                            <Heading size="6" className="font-display text-slate-900">
                              {clinics.filter((entry) => entry.isActive).length}
                            </Heading>
                            <Badge variant="soft" color="green" className="ml-auto">
                              Live now
                            </Badge>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 shadow-sm">
                          <Text size="1" className="uppercase tracking-[0.18em] text-sky-600">
                            Pro / Premium
                          </Text>
                          <div className="mt-1 flex items-end gap-2">
                            <Heading size="6" className="font-display text-slate-900">
                              {
                                clinics.filter(
                                  (entry) =>
                                    entry.subscriptionPlan === "pro" ||
                                    entry.subscriptionPlan === "premium"
                                ).length
                              }
                            </Heading>
                            <Badge variant="soft" color="blue" className="ml-auto">
                              Growth tier
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="app-scrollbar max-h-[440px] overflow-auto">
                    <Table.Root variant="surface">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>Clinic</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Hours</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Today</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell justify="end">Actions</Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>

                      <Table.Body>
                        {clinics.map((clinic) => (
                          <Table.Row key={clinic._id} align="center">
                            <Table.RowHeaderCell>
                              <div className="min-w-[240px]">
                                <Text size="3" className="font-semibold text-slate-900">
                                  {clinic.name}
                                </Text>
                                <Text size="2" className="text-slate-500">
                                  {clinic.city} · {clinic.phone}
                                </Text>
                              </div>
                            </Table.RowHeaderCell>

                            <Table.Cell>
                              <Badge
                                variant="soft"
                                color={getPlanBadgeColor(clinic.subscriptionPlan)}
                              >
                                {clinic.subscriptionPlan}
                              </Badge>
                            </Table.Cell>

                            <Table.Cell>
                              <div className="min-w-[180px]">
                                <Text size="2" className="text-slate-700">
                                  {clinic.startTime} - {clinic.endTime}
                                </Text>
                                <Text size="1" className="text-slate-400">
                                  Slot {clinic.slotDuration} min
                                </Text>
                              </div>
                            </Table.Cell>

                            <Table.Cell>
                              <Badge variant="soft" color="green">
                                {clinic.appointments} appointments
                              </Badge>
                            </Table.Cell>

                            <Table.Cell>
                              <Badge color={clinic.isActive ? "green" : "gray"} variant="soft">
                                {clinic.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </Table.Cell>

                            <Table.Cell justify="end">
                              <Button
                                size="1"
                                variant="soft"
                                onClick={() => setEditingClinic(clinic)}
                              >
                                Edit clinic
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </div>
                </Card>
              )}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <Heading size="6" className="font-display">
              Users & Roles
            </Heading>
            <Text size="2" className="text-slate-500">
              Showing {users.length} users
            </Text>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="md:w-[320px]">
              <TextField.Root
                placeholder="Search by name or email"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div className="md:w-[200px]">
              <Select.Root
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="all">All roles</Select.Item>
                  <Select.Item value="admin">Admin</Select.Item>
                  <Select.Item value="clinic_owner">Clinic owner</Select.Item>
                  <Select.Item value="doctor">Doctor</Select.Item>
                  <Select.Item value="receptionist">Receptionist</Select.Item>
                  <Select.Item value="patient">Patient</Select.Item>
                  <Select.Item value="clinic">Clinic (legacy)</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {usersLoading ? (
              <Card className="border border-slate-200 bg-white/70 p-4">
                <Text size="2" className="text-slate-500">
                  Loading users...
                </Text>
              </Card>
            ) : null}

            {usersError ? (
              <Card className="border border-red-200 bg-red-50 p-4">
                <Text size="2" className="text-red-600">
                  {usersError}
                </Text>
              </Card>
            ) : null}

            {!usersLoading && !usersError && users.length === 0 ? (
              <Card className="border border-slate-200 bg-white/70 p-4">
                <Text size="2" className="text-slate-500">
                  No users found.
                </Text>
              </Card>
            ) : null}

            {!usersLoading &&
              !usersError &&
              (
                <Card className="overflow-hidden border border-slate-200 bg-white/90 p-0 shadow-[0_18px_40px_rgba(15,118,110,0.08)]">
                  <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(240,253,250,0.9),rgba(248,250,252,0.95))] px-4 py-4">
                    <div className="flex flex-col gap-4 lg:items-end">
                      <div className="max-w-2xl text-right lg:self-end">
                        <Text size="1" className="uppercase tracking-[0.24em] text-emerald-600">
                          Access Control
                        </Text>
                        <Heading size="5" className="mt-1 font-display text-slate-900">
                          User directory
                        </Heading>
                        <Text size="2" className="mt-1 text-slate-600">
                          Review account roles, confirm clinic coverage, and update permissions
                          from one place.
                        </Text>
                      </div>

                      <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[560px]">
                        <div className="rounded-2xl border border-rose-100 bg-white/80 px-4 py-3 shadow-sm">
                          <Text size="1" className="uppercase tracking-[0.18em] text-rose-500">
                            Admins
                          </Text>
                          <div className="mt-1 flex items-end gap-2">
                            <Heading size="6" className="font-display text-slate-900">
                              {users.filter((entry) => entry.role === "admin").length}
                            </Heading>
                            <Badge variant="soft" color="ruby" className="ml-auto">
                              Full access
                            </Badge>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 shadow-sm">
                          <Text size="1" className="uppercase tracking-[0.18em] text-sky-600">
                            Staff
                          </Text>
                          <div className="mt-1 flex items-end gap-2">
                            <Heading size="6" className="font-display text-slate-900">
                              {
                                users.filter(
                                  (entry) =>
                                    entry.role === "doctor" || entry.role === "receptionist"
                                ).length
                              }
                            </Heading>
                            <Badge variant="soft" color="blue" className="ml-auto">
                              Assigned clinics
                            </Badge>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                          <Text size="1" className="uppercase tracking-[0.18em] text-slate-500">
                            Patients
                          </Text>
                          <div className="mt-1 flex items-end gap-2">
                            <Heading size="6" className="font-display text-slate-900">
                              {users.filter((entry) => entry.role === "patient").length}
                            </Heading>
                            <Badge variant="soft" color="gray" className="ml-auto">
                              Self-service
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="app-scrollbar max-h-[520px] overflow-auto">
                    <Table.Root variant="surface">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Clinic access</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Updated</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell justify="end">Actions</Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>

                      <Table.Body>
                        {users.map((u) => {
                          const isSelf = user?._id === u._id;
                          const canAssignClinics =
                            u.role === "doctor" || u.role === "receptionist";
                          const assignedClinics = (u.clinicIds ?? [])
                            .map((clinicId) => clinicsById.get(clinicId))
                            .filter((clinic): clinic is Clinic => Boolean(clinic));
                          const visibleClinics = assignedClinics.slice(0, 2);
                          const remainingClinics =
                            assignedClinics.length - visibleClinics.length;

                          return (
                            <Table.Row key={u._id} align="center">
                              <Table.RowHeaderCell>
                                <div className="min-w-[220px]">
                                  <div className="flex items-center gap-2">
                                    <Text size="3" className="font-semibold text-slate-900">
                                      {u.name}
                                    </Text>
                                    {isSelf ? (
                                      <Badge variant="soft" color="green">
                                        You
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <Text size="2" className="text-slate-500">
                                    {u.email}
                                  </Text>
                                </div>
                              </Table.RowHeaderCell>

                              <Table.Cell>
                                <div className="flex min-w-[140px] flex-col gap-2">
                                  <Badge
                                    variant="soft"
                                    color={getRoleBadgeColor(u.role)}
                                    className="w-fit"
                                  >
                                    {getRoleLabel(u.role)}
                                  </Badge>
                                  <Text size="1" className="text-slate-400">
                                    {u.role === "clinic"
                                      ? "Legacy role kept for compatibility"
                                      : "Role-based access control"}
                                  </Text>
                                </div>
                              </Table.Cell>

                              <Table.Cell>
                                <div className="min-w-[220px]">
                                  {canAssignClinics ? (
                                    assignedClinics.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {visibleClinics.map((clinic) => (
                                          <Badge
                                            key={clinic._id}
                                            variant="soft"
                                            color="green"
                                          >
                                            {clinic.name}
                                          </Badge>
                                        ))}
                                        {remainingClinics > 0 ? (
                                          <Badge variant="outline" color="gray">
                                            +{remainingClinics} more
                                          </Badge>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <Text size="2" className="text-slate-500">
                                        No clinics assigned
                                      </Text>
                                    )
                                  ) : (
                                    <Text size="2" className="text-slate-500">
                                      {u.role === "clinic_owner" || u.role === "clinic"
                                        ? "Ownership-based access"
                                        : u.role === "admin"
                                          ? "All clinics"
                                          : "Not applicable"}
                                    </Text>
                                  )}
                                </div>
                              </Table.Cell>

                              <Table.Cell>
                                <Text size="2" className="text-slate-500">
                                  {formatUpdatedAt(u.updatedAt)}
                                </Text>
                              </Table.Cell>

                              <Table.Cell justify="end">
                                <div className="flex min-w-[210px] justify-end gap-2">
                                  {isSelf ? (
                                    <Button size="1" variant="soft" disabled>
                                      Current account
                                    </Button>
                                  ) : (
                                    <Select.Root
                                      value={u.role}
                                      onValueChange={(value) =>
                                        updateUserRole(u._id, value as User["role"])
                                      }
                                    >
                                      <Select.Trigger className="min-w-[150px]" />
                                      <Select.Content>
                                        <Select.Item value="admin">Admin</Select.Item>
                                        <Select.Item value="clinic_owner">
                                          Clinic owner
                                        </Select.Item>
                                        <Select.Item value="doctor">Doctor</Select.Item>
                                        <Select.Item value="receptionist">
                                          Receptionist
                                        </Select.Item>
                                        <Select.Item value="patient">Patient</Select.Item>
                                      </Select.Content>
                                    </Select.Root>
                                  )}

                                  {canAssignClinics ? (
                                    <Button
                                      size="1"
                                      variant="soft"
                                      onClick={() => openAssignModal(u)}
                                    >
                                      Assign clinics
                                    </Button>
                                  ) : null}
                                </div>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Root>
                  </div>
                </Card>
              )}
          </div>
        </section>
      </div>

      <Dialog.Root
        open={!!assigningUser}
        onOpenChange={(open) => {
          if (!open) setAssigningUser(null);
        }}
      >
        <Dialog.Content className="clinic-dialog max-h-[80vh] w-[min(92vw,680px)] overflow-y-auto border border-slate-200 bg-white/95 p-6 shadow-[0_20px_80px_rgba(15,118,110,0.2)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Dialog.Title>
                <Heading size="6" className="font-display">
                  Assign clinics
                </Heading>
              </Dialog.Title>
              <Dialog.Description>
                <Text size="2" className="text-slate-500">
                  {assigningUser ? `Staff member: ${assigningUser.name}` : ""}
                </Text>
              </Dialog.Description>
            </div>
            <Button variant="soft" onClick={() => setAssigningUser(null)}>
              Close
            </Button>
          </div>

          <div className="mt-6 grid gap-3">
            {clinics.length === 0 ? (
              <Card className="border border-slate-200 bg-white/70 p-4">
                <Text size="2" className="text-slate-500">
                  No clinics available to assign.
                </Text>
              </Card>
            ) : (
              clinics.map((clinic) => {
                const isAssigned = selectedClinics.includes(clinic._id);
                return (
                  <button
                    key={clinic._id}
                    type="button"
                    onClick={() => toggleClinicSelection(clinic._id)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${
                      isAssigned
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{clinic.name}</div>
                      <div className="text-xs text-slate-500">
                        {clinic.city} • {clinic.phone}
                      </div>
                    </div>
                    <Badge variant="soft" color={isAssigned ? "green" : "gray"}>
                      {isAssigned ? "Assigned" : "Not assigned"}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="soft" onClick={() => setAssigningUser(null)}>
              Cancel
            </Button>
            <Button onClick={saveAssignedClinics} disabled={!assigningUser}>
              Save assignments
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
};

export default AdminDashboard;
