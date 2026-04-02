import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Heading,
  Select,
  Text,
  TextField,
} from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Clinic, User } from "../types/api";
import ClinicModal from "../components/ClinicModal";
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

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <Heading size="6" className="font-display">
              Clinics
            </Heading>
            <Text size="2" className="text-slate-500">
              Showing {clinics.length} clinics
            </Text>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
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
              clinics.map((clinic) => (
                <Card
                  key={clinic._id}
                  className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Heading size="5" className="font-display">
                      {clinic.name}
                    </Heading>
                    <div className="flex items-center gap-2">
                      <Badge color={clinic.isActive ? "green" : "gray"} variant="soft">
                        {clinic.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => setEditingClinic(clinic)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                  <Text size="2" className="text-slate-500">
                    {clinic.city} - {clinic.phone}
                  </Text>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="rounded-xl bg-emerald-50 px-3 py-2">
                      <div className="text-xs uppercase tracking-wider text-emerald-600">
                        Today
                      </div>
                      <div className="text-lg font-semibold text-emerald-700">
                        {clinic.appointments}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-100 px-3 py-2">
                      <div className="text-xs uppercase tracking-wider text-slate-500">
                        Hours
                      </div>
                      <div className="text-sm font-semibold text-slate-700">
                        {clinic.startTime} - {clinic.endTime}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
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
              users.map((u) => {
                const isSelf = user?._id === u._id;
                const canAssignClinics = u.role === "doctor" || u.role === "receptionist";
                return (
                  <Card
                    key={u._id}
                    className="flex flex-col gap-3 border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,118,110,0.08)] md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <Text size="3" className="font-semibold text-slate-900">
                        {u.name}
                      </Text>
                      <Text size="2" className="text-slate-500">
                        {u.email}
                      </Text>
                    </div>
                    <div className="flex items-center gap-3">
                      {isSelf ? (
                        <Badge variant="soft" color="green">
                          {u.role}
                        </Badge>
                      ) : (
                        <Select.Root
                          value={u.role}
                          onValueChange={(value) =>
                            updateUserRole(u._id, value as User["role"])
                          }
                        >
                          <Select.Trigger />
                          <Select.Content>
                            <Select.Item value="admin">Admin</Select.Item>
                            <Select.Item value="clinic_owner">Clinic owner</Select.Item>
                            <Select.Item value="doctor">Doctor</Select.Item>
                            <Select.Item value="receptionist">Receptionist</Select.Item>
                            <Select.Item value="patient">Patient</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      )}
                      {isSelf ? (
                        <Text size="1" className="text-slate-400">
                          You
                        </Text>
                      ) : null}
                    </div>
                    {canAssignClinics ? (
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => openAssignModal(u)}
                      >
                        Assign clinics
                      </Button>
                    ) : null}
                  </Card>
                );
              })}
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
