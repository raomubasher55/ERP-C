import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Appointment, Clinic } from "../types/api";
import ClinicModal from "../components/ClinicModal";
import ReportsSummaryCards from "../components/ReportsSummaryCards";
import TopNav from "../components/TopNav";
import { normalizeAppointmentStatus } from "../lib/appointment";

const ClinicDashboard = () => {
  const { user, token } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );

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

  const loadToday = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<{ total: number }>("/api/appointments/today", token);
      setTodayCount(res.total);
    } catch {
      setTodayCount(0);
    }
  }, [token]);

  const loadAppointments = useCallback(async () => {
    if (!token) return;
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const query = new URLSearchParams({
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
      }).toString();
      const res = await api.get<{ appointments: Appointment[] }>(
        `/api/appointments?${query}`,
        token
      );
      setAppointments(res.appointments);
    } catch {
      setAppointments([]);
    }
  }, [token]);

  const refreshDashboard = useCallback(async () => {
    if (!token) return;
    await Promise.all([loadClinics(), loadToday(), loadAppointments()]);
  }, [token, loadAppointments, loadClinics, loadToday]);

  useEffect(() => {
    if (!token) return;

    refreshDashboard();

    const interval = window.setInterval(() => {
      refreshDashboard();
    }, 15000);

    const onFocus = () => {
      refreshDashboard();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, refreshDashboard]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const totals = useMemo(() => {
    const active = clinics.filter((c) => c.isActive).length;
    return { active, todayAppointments: todayCount, total: clinics.length };
  }, [clinics, todayCount]);

  const appointmentsByClinic = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((appt) => {
      const list = map.get(appt.clinicId) ?? [];
      list.push(appt);
      map.set(appt.clinicId, list);
    });
    return map;
  }, [appointments]);

  const buildSlots = (clinic: Clinic) => {
    const parseTime = (value?: string) => {
      if (!value) return null;
      const [h, m] = value.split(":").map((v) => Number(v));
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };

    const startMinutes = parseTime(clinic.startTime);
    const endMinutes = parseTime(clinic.endTime);
    if (startMinutes === null || endMinutes === null) return [];

    const breakStart = parseTime(clinic.breakTime?.start);
    const breakEnd = parseTime(clinic.breakTime?.end);
    const duration = Math.max(clinic.slotDuration ?? 15, 5);

    const booked = new Set<number>();
    (appointmentsByClinic.get(clinic._id) ?? []).forEach((appt) => {
      const normalized = normalizeAppointmentStatus(appt.status);
      if (!["pending", "confirmed", "completed"].includes(normalized)) return;
      const date = new Date(appt.scheduledAt);
      const minutes = date.getHours() * 60 + date.getMinutes();
      booked.add(minutes);
    });

    const slots: Array<{ label: string; status: "booked" | "break" | "free" }> = [];
    for (let t = startMinutes; t < endMinutes; t += duration) {
      const hours = Math.floor(t / 60);
      const minutes = t % 60;
      const label = new Date(0, 0, 0, hours, minutes).toLocaleTimeString(
        undefined,
        { hour: "2-digit", minute: "2-digit" }
      );

      const inBreak =
        breakStart !== null &&
        breakEnd !== null &&
        t >= breakStart &&
        t < breakEnd;

      if (inBreak) {
        slots.push({ label, status: "break" });
      } else if (booked.has(t)) {
        slots.push({ label, status: "booked" });
      } else {
        slots.push({ label, status: "free" });
      }
    }
    return slots;
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
            refreshDashboard();
          }}
          onError={(message) => setToast({ message, type: "error" })}
        />
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Clinic Dashboard
            </Text>
            <Heading size="8" className="font-display">
              {user ? `Dr. ${user.name}` : "Clinic Workspace"}
            </Heading>
            <Text size="3" className="text-slate-500">
              Track your clinics and today's appointments.
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
              My Clinics
            </Heading>
            <Text size="2" className="text-slate-500">
              Showing {clinics.length} clinics
            </Text>
          </div>

          <div className="app-scrollbar mt-4 max-h-[42rem] overflow-y-auto pr-2">
            <div className="grid gap-4 md:grid-cols-2">
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
                  <Text size="2" className="text-slate-500">
                    Appointments today: {clinic.appointments ?? 0}
                  </Text>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="rounded-xl bg-emerald-50 px-3 py-2">
                      <div className="text-xs uppercase tracking-wider text-emerald-600">
                        Plan
                      </div>
                      <div className="text-lg font-semibold text-emerald-700">
                        {clinic.subscriptionPlan}
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
                  <div className="mt-4">
                    <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                      Today slots
                    </Text>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {buildSlots(clinic).map((slot, idx) => (
                        <div
                          key={`${clinic._id}-${idx}`}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            slot.status === "booked"
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-[0_8px_16px_rgba(16,185,129,0.2)]"
                              : slot.status === "break"
                                ? "border-slate-200 bg-slate-100 text-slate-400"
                                : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {slot.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ClinicDashboard;
