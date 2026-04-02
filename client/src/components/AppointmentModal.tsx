import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Heading, Text, TextField } from "@radix-ui/themes";
import { api, type ApiError } from "../lib/api";
import type { Appointment, Clinic } from "../types/api";

type AppointmentModalProps = {
  open: boolean;
  token: string;
  clinic: Clinic | null;
  patientName?: string;
  onClose: () => void;
  onBooked: (appointment: Appointment) => void;
  onError: (message: string) => void;
};

const AppointmentModal = ({
  open,
  token,
  clinic,
  patientName,
  onClose,
  onBooked,
  onError,
}: AppointmentModalProps) => {
  const [name, setName] = useState(patientName ?? "");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(patientName ?? "");
      setPhone("");
      setDate("");
      setTime("");
      setNotes("");
      setError(null);
      setBookedSlots([]);
    }
  }, [open, patientName]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!open || !clinic || !date) return;
      setSlotsLoading(true);
      try {
        const res = await api.get<{ slots: string[] }>(
          `/api/appointments/slots?clinicId=${clinic._id}&date=${date}`,
          token
        );
        setBookedSlots(res.slots);
      } catch {
        setBookedSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    loadSlots();
  }, [open, clinic, date, token]);

  const scheduledAt = useMemo(() => {
    if (!date || !time) return "";
    const dt = new Date(`${date}T${time}:00`);
    return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
  }, [date, time]);

  const timeSlots = useMemo(() => {
    if (!clinic || !date) return [];
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

    const bookedSet = new Set(
      bookedSlots.map((iso) => {
        const d = new Date(iso);
        return d.getHours() * 60 + d.getMinutes();
      })
    );

    const slots: Array<{ label: string; value: string; status: "free" | "booked" | "break" }> = [];
    for (let t = startMinutes; t < endMinutes; t += duration) {
      const hours = Math.floor(t / 60);
      const minutes = t % 60;
      const label = new Date(0, 0, 0, hours, minutes).toLocaleTimeString(
        undefined,
        { hour: "2-digit", minute: "2-digit" }
      );
      const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      const inBreak =
        breakStart !== null && breakEnd !== null && t >= breakStart && t < breakEnd;
      if (inBreak) {
        slots.push({ label, value, status: "break" });
      } else if (bookedSet.has(t)) {
        slots.push({ label, value, status: "booked" });
      } else {
        slots.push({ label, value, status: "free" });
      }
    }
    return slots;
  }, [clinic, date, bookedSlots]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!clinic) return;
    if (!name.trim() || !date || !time) {
      setError("Patient name, date, and time are required.");
      return;
    }
    if (!scheduledAt) {
      setError("Please select a valid date/time.");
      return;
    }
    if (bookedSlots.some((iso) => iso === scheduledAt)) {
      setError("This slot is already booked.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ appointment: Appointment }>(
        "/api/appointments",
        {
          clinicId: clinic._id,
          patientName: name.trim(),
          patientPhone: phone.trim() || undefined,
          scheduledAt,
          notes: notes.trim() || undefined,
        },
        token
      );
      onBooked(res.appointment);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Unable to book appointment");
      onError(apiError.message || "Unable to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Content className="max-h-[90vh] w-[min(92vw,520px)] overflow-y-auto border border-slate-200 bg-white/95 p-6 shadow-[0_20px_80px_rgba(15,118,110,0.2)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Dialog.Title>
              <Heading size="6" className="font-display">
                Book appointment
              </Heading>
            </Dialog.Title>
            <Dialog.Description>
              <Text size="2" className="text-slate-500">
                {clinic ? `Clinic: ${clinic.name}` : "Select a clinic"}
              </Text>
            </Dialog.Description>
          </div>
          <Button variant="soft" onClick={onClose} disabled={submitting}>
            Close
          </Button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm text-slate-600">
            Patient name
            <TextField.Root
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="mt-2"
            />
          </label>

          <label className="block text-sm text-slate-600">
            Phone (optional)
            <TextField.Root
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+92-300-1234567"
              className="mt-2"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Date
              <TextField.Root
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Time
              <TextField.Root
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="mt-2"
              />
            </label>
          </div>

          {date ? (
            <div>
              <Text size="2" className="text-slate-500">
                Available slots
              </Text>
              {slotsLoading ? (
                <Text size="2" className="mt-2 text-slate-500">
                  Loading slots...
                </Text>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={`${slot.value}-${slot.status}`}
                      type="button"
                      disabled={slot.status !== "free"}
                      onClick={() => setTime(slot.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        slot.status === "booked"
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-[0_8px_16px_rgba(16,185,129,0.2)]"
                          : slot.status === "break"
                            ? "border-slate-200 bg-slate-100 text-slate-400"
                            : time === slot.value
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <label className="block text-sm text-slate-600">
            Notes (optional)
            <TextField.Root
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Reason for visit"
              className="mt-2"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Button variant="soft" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !clinic}>
              {submitting ? "Booking..." : "Book appointment"}
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default AppointmentModal;
