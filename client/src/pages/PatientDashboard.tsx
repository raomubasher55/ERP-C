import { Badge, Button, Card, Heading, Text } from "@radix-ui/themes";
import { useAuth } from "../context/AuthContext";
import TopNav from "../components/TopNav";
import { api } from "../lib/api";
import type { Appointment, AppointmentStatus, Clinic } from "../types/api";
import { useEffect, useMemo, useState } from "react";
import AppointmentModal from "../components/AppointmentModal";

const PatientDashboard = () => {
  const { user, token } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  useEffect(() => {
    const loadClinics = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ clinics: Clinic[] }>("/api/clinics/public");
        setClinics(res.clinics);
      } catch (err) {
        const message = (err as { message?: string })?.message || "Unable to load clinics";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    loadClinics();
  }, []);

  const loadAppointments = async () => {
    if (!token) return;
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      const res = await api.get<{ appointments: Appointment[] }>(
        "/api/appointments?sortBy=scheduledAt&sortOrder=desc&limit=20",
        token
      );
      setAppointments(res.appointments);
    } catch (err) {
      const message =
        (err as { message?: string })?.message || "Unable to load appointments";
      setAppointmentsError(message);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadAppointments();
  }, [token]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const availableClinics = useMemo(
    () => clinics.filter((c) => c.isActive),
    [clinics]
  );

  const clinicNameById = useMemo(() => {
    const map = new Map<string, string>();
    clinics.forEach((clinic) => map.set(clinic._id, clinic.name));
    return map;
  }, [clinics]);

  const now = new Date();
  const upcomingCount = appointments.filter(
    (appt) =>
      appt.status === "scheduled" && new Date(appt.scheduledAt).getTime() >= now.getTime()
  ).length;

  const statusBadgeColor = (status: AppointmentStatus) => {
    if (status === "completed") return "green";
    if (status === "cancelled") return "red";
    if (status === "no_show") return "gray";
    return "blue";
  };

  const cancelAppointment = async (appointment: Appointment) => {
    if (!token) return;
    try {
      await api.patch(
        `/api/appointments/${appointment._id}`,
        { status: "cancelled" },
        token
      );
      setToast({ message: "Appointment cancelled", type: "success" });
      loadAppointments();
    } catch (err) {
      const message =
        (err as { message?: string })?.message || "Unable to cancel appointment";
      setToast({ message, type: "error" });
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
        <AppointmentModal
          open={!!selectedClinic}
          token={token}
          clinic={selectedClinic}
          patientName={user?.name}
          onClose={() => setSelectedClinic(null)}
          onBooked={() => {
            setToast({ message: "Appointment requested", type: "success" });
            setSelectedClinic(null);
            loadAppointments();
          }}
          onError={(message) => setToast({ message, type: "error" })}
        />
      ) : null}
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Patient Portal
            </Text>
            <Heading size="8" className="font-display">
              {user ? `Hi, ${user.name}` : "Welcome"}
            </Heading>
            <Text size="3" className="text-slate-500">
              Your patient dashboard is ready for upcoming appointments and updates.
            </Text>
          </div>
        </header>

        <section className="mt-10">
          <Card className="border border-emerald-200 bg-emerald-50/70 p-6">
            <Heading size="5" className="font-display">
              Your care hub
            </Heading>
            <Text size="3" className="mt-2 text-slate-600">
              Keep track of upcoming visits, reminders, and messages from your clinic.
            </Text>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="2" variant="solid" disabled>
                Request appointment
              </Button>
              <Button size="2" variant="soft" disabled>
                Contact clinic
              </Button>
            </div>
          </Card>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { label: "Upcoming visits", value: String(upcomingCount) },
            { label: "Reminders", value: "0" },
            { label: "Messages", value: "0" },
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

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
            <Heading size="5" className="font-display">
              My appointments
            </Heading>
            <Text size="3" className="mt-2 text-slate-600">
              Track your upcoming visits and manage bookings.
            </Text>

            <div className="mt-4 space-y-3">
              {appointmentsLoading ? (
                <Text size="2" className="text-slate-500">
                  Loading appointments...
                </Text>
              ) : null}
              {appointmentsError ? (
                <Text size="2" className="text-red-600">
                  {appointmentsError}
                </Text>
              ) : null}
              {!appointmentsLoading && !appointmentsError && appointments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No appointments yet. Book your first visit from the clinics list.
                </div>
              ) : null}
              {!appointmentsLoading &&
                !appointmentsError &&
                appointments.map((appointment) => {
                  const clinicName =
                    clinicNameById.get(appointment.clinicId) ?? "Clinic";
                  const scheduled = new Date(appointment.scheduledAt);
                  const isFuture = scheduled.getTime() >= now.getTime();
                  return (
                    <div
                      key={appointment._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3"
                    >
                      <div>
                        <Text size="2" className="font-semibold text-slate-800">
                          {clinicName}
                        </Text>
                        <Text size="1" className="text-slate-500">
                          {scheduled.toLocaleString()}
                        </Text>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={statusBadgeColor(appointment.status)} variant="soft">
                          {appointment.status.replace("_", " ")}
                        </Badge>
                        {appointment.status === "scheduled" && isFuture ? (
                          <Button
                            size="2"
                            variant="soft"
                            onClick={() => cancelAppointment(appointment)}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          <Card className="border border-emerald-100 bg-emerald-50/60 p-6">
            <Heading size="5" className="font-display">
              Available clinics
            </Heading>
            <Text size="3" className="mt-2 text-slate-600">
              Choose a clinic to request an appointment.
            </Text>
            <div className="mt-4 space-y-3">
              {loading ? (
                <Text size="2" className="text-slate-500">
                  Loading clinics...
                </Text>
              ) : null}
              {error ? (
                <Text size="2" className="text-red-600">
                  {error}
                </Text>
              ) : null}
              {!loading && !error && availableClinics.length === 0 ? (
                <Text size="2" className="text-slate-500">
                  No active clinics available right now.
                </Text>
              ) : null}
              {!loading &&
                !error &&
                availableClinics.map((clinic) => (
                  <div
                    key={clinic._id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white/80 px-4 py-3"
                  >
                    <div>
                      <Text size="2" className="font-semibold text-slate-800">
                        {clinic.name}
                      </Text>
                      <Text size="1" className="text-slate-500">
                        {clinic.city} • {clinic.phone}
                      </Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="green" variant="soft">
                        Active
                      </Badge>
                      <Button size="2" variant="solid" onClick={() => setSelectedClinic(clinic)}>
                        Book
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default PatientDashboard;
