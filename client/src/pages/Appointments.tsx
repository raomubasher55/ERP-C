import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Badge, Button, Card, Dialog, Heading, Select, Text, TextField } from "@radix-ui/themes";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Appointment, AppointmentStatus, Clinic } from "../types/api";
import AppointmentModal from "../components/AppointmentModal";
import TopNav from "../components/TopNav";
import ReportsSummaryCards from "../components/ReportsSummaryCards";
import { CalendarSlot } from "../components/FieldIcons";
import { Link } from "react-router-dom";
import {
  appointmentStatusOptions,
  formatAppointmentStatusLabel,
  getAppointmentStatusBadgeColor,
  isPatientCancelableStatus,
  normalizeAppointmentStatus,
} from "../lib/appointment";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const toLocalInputValue = (iso: string) => {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toIsoFromLocalInput = (value: string) => {
  if (!value) return "";
  return new Date(value).toISOString();
};

type EditFormState = {
  patientName: string;
  patientPhone: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes: string;
};

type AppointmentEditModalProps = {
  open: boolean;
  appointment: Appointment | null;
  clinics: Clinic[];
  token: string;
  onClose: () => void;
  onSaved: () => void;
};

const AppointmentEditModal = ({
  open,
  appointment,
  clinics,
  token,
  onClose,
  onSaved,
}: AppointmentEditModalProps) => {
  const [form, setForm] = useState<EditFormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointment) return;
    setForm({
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone ?? "",
      scheduledAt: toLocalInputValue(appointment.scheduledAt),
      status: appointment.status,
      notes: appointment.notes ?? "",
    });
    setError(null);
    setSubmitting(false);
  }, [appointment]);

  const clinicName = useMemo(() => {
    if (!appointment) return "";
    return clinics.find((c) => c._id === appointment.clinicId)?.name ?? "Clinic";
  }, [appointment, clinics]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!appointment || !form) return;
    setSubmitting(true);
    setError(null);

    try {
      await api.patch(
        `/api/appointments/${appointment._id}`,
        {
          patientName: form.patientName.trim(),
          patientPhone: form.patientPhone.trim() || undefined,
          scheduledAt: toIsoFromLocalInput(form.scheduledAt),
          status: form.status,
          notes: form.notes.trim() || undefined,
        },
        token
      );
      onSaved();
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to update";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <Dialog.Content className="clinic-dialog max-h-[90vh] w-[min(90vw,640px)] overflow-y-auto border border-slate-200 bg-white/95 p-6 shadow-[0_20px_80px_rgba(15,118,110,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Dialog.Title>
              <Heading size="6" className="font-display">
                Edit appointment
              </Heading>
            </Dialog.Title>
            <Dialog.Description>
              <Text size="2" className="text-slate-500">
                Update appointment details for {clinicName}.
              </Text>
            </Dialog.Description>
          </div>
          <Button variant="soft" onClick={onClose} disabled={submitting}>
            Close
          </Button>
        </div>

        {appointment && form ? (
          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm text-slate-600">
              Patient name
              <TextField.Root
                value={form.patientName}
                onChange={(event) =>
                  setForm((prev) =>
                    prev ? { ...prev, patientName: event.target.value } : prev
                  )
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              Patient phone
              <TextField.Root
                value={form.patientPhone}
                onChange={(event) =>
                  setForm((prev) =>
                    prev ? { ...prev, patientPhone: event.target.value } : prev
                  )
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              Scheduled at
              <TextField.Root
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          scheduledAt: (event as ChangeEvent<HTMLInputElement>).target.value,
                        }
                      : prev
                  )
                }
              >
                <CalendarSlot />
              </TextField.Root>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              Status
              <Select.Root
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) =>
                    prev ? { ...prev, status: value as AppointmentStatus } : prev
                  )
                }
              >
                <Select.Trigger />
                <Select.Content>
                  {appointmentStatusOptions.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              Notes
              <textarea
                className="min-h-[96px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                }
              />
            </label>

            {error ? (
              <Text size="2" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600">
                {error}
              </Text>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save changes"}
              </Button>
              <Button type="button" variant="soft" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
};

const Appointments = () => {
  const { user, token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<"scheduledAt" | "createdAt" | "status">("scheduledAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState({
    status: "",
    clinicId: "",
    dateFrom: "",
    dateTo: "",
  });

  const clinicMap = useMemo(() => {
    const map = new Map<string, Clinic>();
    clinics.forEach((clinic) => map.set(clinic._id, clinic));
    return map;
  }, [clinics]);

  const loadClinics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<{ clinics: Clinic[] }>('/api/clinics', token);
      setClinics(res.clinics);
    } catch {
      setClinics([]);
    }
  }, [token]);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    if (filters.status) params.set("status", filters.status);
    if (filters.clinicId) params.set("clinicId", filters.clinicId);
    if (filters.dateFrom) {
      params.set("dateFrom", new Date(`${filters.dateFrom}T00:00:00`).toISOString());
    }
    if (filters.dateTo) {
      params.set("dateTo", new Date(`${filters.dateTo}T23:59:59`).toISOString());
    }
    return params.toString();
  };

  const loadAppointments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const query = buildQuery();
      const path = query ? `/api/appointments?${query}` : "/api/appointments";
      const res = await api.get<{ appointments: Appointment[]; total: number }>(path, token);
      setAppointments(res.appointments);
      setTotal(res.total ?? 0);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to load appointments";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, filters, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    if (token) {
      loadClinics();
      loadAppointments();
    }
  }, [token, loadAppointments, loadClinics]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateStatus = async (appointment: Appointment, status: AppointmentStatus) => {
    if (!token) return;
    try {
      await api.patch(
        `/api/appointments/${appointment._id}`,
        { status },
        token
      );
      loadAppointments();
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to update status";
      setError(message);
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
      {token && user && user.role !== "patient" ? (
        <AppointmentEditModal
          open={!!editing}
          appointment={editing}
          clinics={clinics}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadAppointments();
          }}
        />
      ) : null}
      {token && user && user.role !== "patient" ? (
        <AppointmentModal
          open={isBookingOpen}
          token={token}
          clinic={clinics[0] ?? null}
          clinics={clinics}
          onClose={() => setIsBookingOpen(false)}
          onBooked={() => {
            setToast({ message: "Appointment created", type: "success" });
            setIsBookingOpen(false);
            loadAppointments();
          }}
          onError={(message) => setToast({ message, type: "error" })}
        />
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Appointments
            </Text>
            <Heading size="8" className="font-display">
              {user?.role === "patient" ? "My appointments" : "Clinic appointments"}
            </Heading>
            <Text size="3" className="text-slate-500">
              {user?.role === "patient"
                ? "Review your bookings and cancel when needed."
                : "Review and update appointment workflow."}
            </Text>
          </div>
          {user?.role === "patient" ? (
            <div className="flex items-center gap-3">
              <Text size="2" className="text-slate-500">
                Use the patient dashboard to request a new appointment.
              </Text>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button onClick={() => setIsBookingOpen(true)} disabled={clinics.length === 0}>
                New appointment
              </Button>
              <Button asChild variant="soft">
                <Link to="/inventory">Inventory</Link>
              </Button>
              <Button asChild variant="soft">
                <Link to="/billing">Billing</Link>
              </Button>
            </div>
          )}
        </header>

        {token && user?.role !== "patient" ? (
          <ReportsSummaryCards token={token} preset="7d" title="Analytics snapshot" />
        ) : null}

        <section className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 md:grid-cols-5">
          <label className="grid gap-2 text-sm text-slate-600">
            Status
            <Select.Root
              value={filters.status || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: value === "all" ? "" : value,
                }))
              }
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="all">All</Select.Item>
                {appointmentStatusOptions.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            Clinic
            <Select.Root
              value={filters.clinicId || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  clinicId: value === "all" ? "" : value,
                }))
              }
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="all">All clinics</Select.Item>
                {clinics.map((clinic) => (
                  <Select.Item key={clinic._id} value={clinic._id}>
                    {clinic.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            From
            <TextField.Root
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  dateFrom: (event as ChangeEvent<HTMLInputElement>).target.value,
                }))
              }
            >
              <CalendarSlot />
            </TextField.Root>
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            To
            <TextField.Root
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  dateTo: (event as ChangeEvent<HTMLInputElement>).target.value,
                }))
              }
            >
              <CalendarSlot />
            </TextField.Root>
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            Sort
            <Select.Root
              value={`${sortBy}:${sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split(":");
                setSortBy(field as typeof sortBy);
                setSortOrder(order as typeof sortOrder);
                setPage(1);
              }}
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="scheduledAt:asc">Time (oldest first)</Select.Item>
                <Select.Item value="scheduledAt:desc">Time (newest first)</Select.Item>
                <Select.Item value="createdAt:desc">Created (newest)</Select.Item>
                <Select.Item value="createdAt:asc">Created (oldest)</Select.Item>
                <Select.Item value="status:asc">Status (A-Z)</Select.Item>
                <Select.Item value="status:desc">Status (Z-A)</Select.Item>
              </Select.Content>
            </Select.Root>
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            Page size
            <Select.Root
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
            >
              <Select.Trigger />
              <Select.Content>
                {[10, 20, 50].map((size) => (
                  <Select.Item key={size} value={String(size)}>
                    {size} / page
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </label>
          <div className="md:col-span-5 flex items-center gap-3">
            <Button size="2" variant="soft" onClick={loadAppointments}>
              Apply filters
            </Button>
            <Button
              size="2"
              variant="ghost"
              onClick={() => {
                setFilters({ status: "", clinicId: "", dateFrom: "", dateTo: "" });
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <Heading size="6" className="font-display">
              Appointments
            </Heading>
            <Text size="2" className="text-slate-500">
              Showing {appointments.length} of {total} appointments
            </Text>
          </div>

          <div className="app-scrollbar mt-4 max-h-[42rem] overflow-y-auto pr-2">
            <div className="grid gap-4">
            {loading ? (
              <Card className="border border-slate-200 bg-white/70 p-6">
                <Text size="2" className="text-slate-500">
                  Loading appointments...
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

            {!loading && !error && appointments.length === 0 ? (
              <Card className="border border-slate-200 bg-white/70 p-6">
                <Text size="2" className="text-slate-500">
                  No appointments found.
                </Text>
              </Card>
            ) : null}

            {!loading &&
              !error &&
              appointments.map((appointment) => {
                const clinic = clinicMap.get(appointment.clinicId);
                const normalizedStatus = normalizeAppointmentStatus(appointment.status);
                return (
                  <Card
                    key={appointment._id}
                    className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <Heading size="5" className="font-display">
                          {appointment.patientName}
                        </Heading>
                        <Text size="2" className="text-slate-500">
                          {clinic?.name ?? "Clinic"}
                        </Text>
                        <Text size="2" className="text-slate-400">
                          {formatDateTime(appointment.scheduledAt)}
                        </Text>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          color={getAppointmentStatusBadgeColor(appointment.status)}
                          variant="soft"
                        >
                          {formatAppointmentStatusLabel(appointment.status)}
                        </Badge>
                        <Button asChild size="1" variant="soft">
                          <Link to={`/appointments/${appointment._id}`}>Details</Link>
                        </Button>
                        {user?.role === "patient" ? (
                          <Button
                            size="1"
                            variant="soft"
                            disabled={!isPatientCancelableStatus(appointment.status)}
                            onClick={() => updateStatus(appointment, "cancelled")}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              size="1"
                              variant="soft"
                              onClick={() => setEditing(appointment)}
                            >
                              Edit
                            </Button>
                            {normalizedStatus === "pending" ? (
                              <>
                                <Button
                                  size="1"
                                  variant="soft"
                                  onClick={() => updateStatus(appointment, "confirmed")}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="1"
                                  variant="soft"
                                  onClick={() => updateStatus(appointment, "cancelled")}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : null}
                            {normalizedStatus === "confirmed" ? (
                              <>
                                <Button
                                  size="1"
                                  variant="soft"
                                  onClick={() => updateStatus(appointment, "completed")}
                                >
                                  Complete
                                </Button>
                                <Button
                                  size="1"
                                  variant="soft"
                                  onClick={() => updateStatus(appointment, "cancelled")}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="1"
                                  variant="soft"
                                  onClick={() => updateStatus(appointment, "no_show")}
                                >
                                  No show
                                </Button>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-slate-400">
                          Phone
                        </span>
                        <div>{appointment.patientPhone || "—"}</div>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wider text-slate-400">
                          Notes
                        </span>
                        <div>{appointment.notes || "—"}</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="soft"
              size="2"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </Button>
            <Text size="2" className="text-slate-500">
              Page {page} of {Math.max(1, Math.ceil(total / limit))}
            </Text>
            <Button
              variant="soft"
              size="2"
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Appointments;


