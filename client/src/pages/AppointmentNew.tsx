import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Button, Card, Heading, Select, Text, TextField } from "@radix-ui/themes";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Clinic } from "../types/api";
import TopNav from "../components/TopNav";
import { CalendarSlot } from "../components/FieldIcons";

const toIsoFromLocalInput = (value: string) => {
  if (!value) return "";
  return new Date(value).toISOString();
};

const AppointmentNew = () => {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicId, setClinicId] = useState(searchParams.get("clinicId") ?? "");
  const [form, setForm] = useState({
    patientName: user?.name ?? "",
    patientPhone: "",
    scheduledAt: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClinics = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ clinics: Clinic[] }>("/api/clinics", token);
        const visibleClinics =
          user?.role === "patient" ? res.clinics.filter((c) => c.isActive) : res.clinics;
        setClinics(visibleClinics);
        const selected = visibleClinics.find((c) => c._id === clinicId);
        if (!selected) {
          setClinicId(visibleClinics[0]?._id ?? "");
        }
      } catch (err) {
        const message = (err as { message?: string })?.message || "Unable to load clinics";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    loadClinics();
  }, [token, user?.role]);

  useEffect(() => {
    if (user?.name) {
      setForm((prev) => ({ ...prev, patientName: prev.patientName || user.name }));
    }
  }, [user?.name]);

  const selectedClinic = useMemo(
    () => clinics.find((clinic) => clinic._id === clinicId) ?? null,
    [clinics, clinicId]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!clinicId || !form.patientName.trim() || !form.scheduledAt) {
      setError("Clinic, patient name, and schedule time are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(
        "/api/appointments",
        {
          clinicId,
          patientName: form.patientName.trim(),
          patientPhone: form.patientPhone.trim() || undefined,
          scheduledAt: toIsoFromLocalInput(form.scheduledAt),
          notes: form.notes.trim() || undefined,
        },
        token
      );
      navigate("/appointments");
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to book";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-gradient text-slate-950">
      <TopNav />
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              New Appointment
            </Text>
            <Heading size="8" className="font-display">
              Book an appointment
            </Heading>
            <Text size="3" className="text-slate-500">
              Select a clinic and request your preferred time.
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="soft">
              <Link to="/appointments">Back to appointments</Link>
            </Button>
          </div>
        </header>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <Card className="border border-slate-200 bg-white/80 p-6">
            <Heading size="5" className="font-display">
              Appointment details
            </Heading>
            <Text size="2" className="text-slate-500">
              Provide the details for your booking.
            </Text>
            <form className="mt-6 grid gap-4" onSubmit={submit}>
              <label className="grid gap-2 text-sm text-slate-600">
                Clinic
                <Select.Root
                  value={clinicId || "none"}
                  onValueChange={(value) => setClinicId(value === "none" ? "" : value)}
                  disabled={loading}
                >
                  <Select.Trigger className="mt-2" placeholder="Select clinic" />
                  <Select.Content>
                    <Select.Item value="none">Select clinic</Select.Item>
                    {clinics.map((clinic) => (
                      <Select.Item key={clinic._id} value={clinic._id}>
                        {clinic.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                Patient name
                <TextField.Root
                  value={form.patientName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, patientName: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                Patient phone
                <TextField.Root
                  value={form.patientPhone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, patientPhone: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                Scheduled at
                <TextField.Root
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      scheduledAt: (event as ChangeEvent<HTMLInputElement>).target.value,
                    }))
                  }
                >
                  <CalendarSlot />
                </TextField.Root>
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                Notes
                <textarea
                  className="min-h-[96px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </label>

              {error ? (
                <Text size="2" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600">
                  {error}
                </Text>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={submitting || loading}>
                  {submitting ? "Booking..." : "Book appointment"}
                </Button>
                <Button type="button" variant="soft" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>

          <Card className="border border-emerald-200 bg-emerald-50/70 p-6">
            <Heading size="5" className="font-display">
              Clinic summary
            </Heading>
            {selectedClinic ? (
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div>
                  <Text size="2" className="text-slate-500">
                    Clinic
                  </Text>
                  <div className="text-base font-semibold">{selectedClinic.name}</div>
                </div>
                <div>
                  <Text size="2" className="text-slate-500">
                    Phone
                  </Text>
                  <div>{selectedClinic.phone}</div>
                </div>
                <div>
                  <Text size="2" className="text-slate-500">
                    City
                  </Text>
                  <div>{selectedClinic.city}</div>
                </div>
                <div>
                  <Text size="2" className="text-slate-500">
                    Hours
                  </Text>
                  <div>
                    {selectedClinic.startTime} - {selectedClinic.endTime}
                  </div>
                </div>
                <div>
                  <Text size="2" className="text-slate-500">
                    Appointments today
                  </Text>
                  <div>{selectedClinic.appointments ?? 0}</div>
                </div>
              </div>
            ) : (
              <Text size="2" className="text-slate-500">
                Select a clinic to view its details.
              </Text>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppointmentNew;


