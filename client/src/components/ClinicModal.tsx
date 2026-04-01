import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Button, Dialog, Heading, Select, Text, TextField } from "@radix-ui/themes";
import { api, type ApiError } from "../lib/api";
import type { Clinic, ClinicCreatePayload, User } from "../types/api";
import { ClockSlot } from "./FieldIcons";

type ClinicModalProps = {
  open: boolean;
  mode: "create" | "edit";
  clinic?: Clinic | null;
  token: string;
  userRole?: "admin" | "clinic" | "patient";
  onClose: () => void;
  onSaved: (clinic: Clinic) => void;
  onError: (message: string) => void;
};

const DEFAULT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const createDefaultPayload = (): ClinicCreatePayload => ({
  ownerUserId: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "Lahore",
  ownerName: "",
  subscriptionPlan: "starter",
  workingDays: DEFAULT_DAYS,
  startTime: "",
  endTime: "",
  slotDuration: 15,
  breakTime: { start: "", end: "" },
  features: { whatsappReminder: false, onlineBooking: false },
  isActive: true,
});

const toFormPayload = (clinic?: Clinic | null): ClinicCreatePayload => {
  if (!clinic) return createDefaultPayload();
  return {
    ownerUserId: clinic.ownerUserId,
    name: clinic.name ?? "",
    phone: clinic.phone ?? "",
    email: clinic.email ?? "",
    address: clinic.address ?? "",
    city: clinic.city ?? "Lahore",
    ownerName: clinic.ownerName ?? "",
    subscriptionPlan: clinic.subscriptionPlan ?? "starter",
    workingDays: clinic.workingDays ?? DEFAULT_DAYS,
    startTime: clinic.startTime ?? "",
    endTime: clinic.endTime ?? "",
    slotDuration: clinic.slotDuration ?? 15,
    breakTime: clinic.breakTime ?? { start: "", end: "" },
    features: clinic.features ?? { whatsappReminder: false, onlineBooking: false },
    isActive: clinic.isActive ?? true,
  };
};

const ClinicModal = ({
  open,
  mode,
  clinic,
  token,
  userRole,
  onClose,
  onSaved,
  onError,
}: ClinicModalProps) => {
  const [form, setForm] = useState<ClinicCreatePayload>(() => toFormPayload(clinic));
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [clinicUsers, setClinicUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormPayload(clinic));
      setFieldErrors({});
      setFormError(null);
    }
  }, [open, clinic]);

  useEffect(() => {
    const loadClinicUsers = async () => {
      if (!open || userRole !== "admin") return;
      setUsersLoading(true);
      try {
        const res = await api.get<{ users: User[] }>(
          "/api/users?role=clinic",
          token
        );
        setClinicUsers(res.users);
      } catch {
        setClinicUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };
    loadClinicUsers();
  }, [open, userRole, token]);

  const resetForm = () => {
    setForm(toFormPayload(clinic));
    setFieldErrors({});
    setFormError(null);
  };

  const onCloseModal = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const hasDay = (day: string) => form.workingDays?.includes(day) ?? false;

  const toggleDay = (day: string) => {
    const current = new Set(form.workingDays ?? []);
    if (current.has(day)) {
      current.delete(day);
    } else {
      current.add(day);
    }
    setForm((prev) => ({ ...prev, workingDays: Array.from(current) }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Clinic name is required.";
    if (!form.phone.trim()) errors.phone = "Phone number is required.";
    if (!form.startTime.trim()) errors.startTime = "Start time is required.";
    if (!form.endTime.trim()) errors.endTime = "End time is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const sanitizedPayload = useMemo(() => {
    const clean = { ...form };
    const trimOrUndefined = (value?: string) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    };

    if (userRole === "admin") {
      clean.ownerUserId = trimOrUndefined(form.ownerUserId);
    } else {
      delete clean.ownerUserId;
    }

    clean.name = form.name.trim();
    clean.phone = form.phone.trim();
    clean.email = trimOrUndefined(form.email);
    clean.address = trimOrUndefined(form.address);
    clean.city = trimOrUndefined(form.city) ?? "Lahore";
    clean.ownerName = trimOrUndefined(form.ownerName);

    if (clean.breakTime) {
      const start = trimOrUndefined(clean.breakTime.start);
      const end = trimOrUndefined(clean.breakTime.end);
      clean.breakTime = start || end ? { start, end } : undefined;
    }

    if (clean.features) {
      clean.features = {
        whatsappReminder: !!clean.features.whatsappReminder,
        onlineBooking: !!clean.features.onlineBooking,
      };
    }

    return clean;
  }, [form]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const res =
        mode === "edit" && clinic?._id
          ? await api.patch<{ clinic: Clinic }>(
              `/api/clinics/${clinic._id}`,
              sanitizedPayload,
              token
            )
          : await api.post<{ clinic: Clinic }>("/api/clinics", sanitizedPayload, token);
      onSaved(res.clinic);
      resetForm();
    } catch (err) {
      const apiError = err as ApiError;
      setFormError(apiError.message || "Unable to save clinic");
      if (apiError.errors) {
        const errors: Record<string, string> = {};
        for (const issue of apiError.errors) {
          if (issue.path) {
            errors[issue.path] = issue.message;
          }
        }
        setFieldErrors(errors);
      }
      onError(apiError.message || "Unable to create clinic");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCloseModal();
      }}
    >
      <Dialog.Content className="clinic-dialog max-h-[90vh] w-[min(90vw,720px)] overflow-y-auto border border-slate-200 bg-white/95 p-6 shadow-[0_20px_80px_rgba(15,118,110,0.2)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Dialog.Title>
              <Heading size="6" className="font-display">
                {mode === "edit" ? "Edit Clinic" : "New Clinic"}
              </Heading>
            </Dialog.Title>
            <Dialog.Description>
              <Text size="2" className="text-slate-500">
                {mode === "edit"
                  ? "Update clinic details, working hours, and features."
                  : "Add clinic details, working hours, and features."}
              </Text>
            </Dialog.Description>
          </div>
          <Button variant="soft" onClick={onCloseModal} disabled={submitting}>
            Close
          </Button>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <div className="md:col-span-2">
            <label className="text-sm text-slate-600">
              Clinic name
              <TextField.Root
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="City Care Clinic"
                className="mt-2"
              />
            </label>
            {fieldErrors.name ? (
              <Text size="1" className="text-red-600">
                {fieldErrors.name}
              </Text>
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Phone
              <TextField.Root
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="+92-300-1234567"
                className="mt-2"
              />
            </label>
            {fieldErrors.phone ? (
              <Text size="1" className="text-red-600">
                {fieldErrors.phone}
              </Text>
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Email
              <TextField.Root
                value={form.email ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="clinic@example.com"
                className="mt-2"
              />
            </label>
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Address
              <TextField.Root
                value={form.address ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="1 Main Road"
                className="mt-2"
              />
            </label>
          </div>

          <div>
            <label className="text-sm text-slate-600">
              City
              <TextField.Root
                value={form.city ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="Lahore"
                className="mt-2"
              />
            </label>
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Owner name
              <TextField.Root
                value={form.ownerName ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ownerName: event.target.value }))
                }
                placeholder="Dr. Ayesha"
                className="mt-2"
              />
            </label>
          </div>

          {userRole === "admin" ? (
            <div>
              <label className="text-sm text-slate-600">
                Clinic owner (admin only)
                <Select.Root
                  value={form.ownerUserId ?? "none"}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      ownerUserId: value === "none" ? undefined : value,
                    }))
                  }
                >
                  <Select.Trigger
                    className="mt-2"
                    placeholder={
                      usersLoading ? "Loading clinic users..." : "Select clinic user"
                    }
                  />
                  <Select.Content>
                    <Select.Item value="none">
                      {usersLoading ? "Loading clinic users..." : "Select clinic user"}
                    </Select.Item>
                    {clinicUsers.map((u) => (
                      <Select.Item key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>
              {fieldErrors.ownerUserId ? (
                <Text size="1" className="text-red-600">
                  {fieldErrors.ownerUserId}
                </Text>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="text-sm text-slate-600">
              Subscription plan
              <Select.Root
                value={form.subscriptionPlan ?? "starter"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    subscriptionPlan: value as ClinicCreatePayload["subscriptionPlan"],
                  }))
                }
              >
                <Select.Trigger className="mt-2" />
                <Select.Content>
                  <Select.Item value="starter">Starter</Select.Item>
                  <Select.Item value="pro">Pro</Select.Item>
                  <Select.Item value="premium">Premium</Select.Item>
                </Select.Content>
              </Select.Root>
            </label>
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Slot duration (minutes)
              <TextField.Root
                type="number"
                value={form.slotDuration ?? 15}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    slotDuration: Number(event.target.value) || 0,
                  }))
                }
                min={1}
                className="mt-2"
              />
            </label>
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Start time
              <TextField.Root
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    startTime: (event as ChangeEvent<HTMLInputElement>).target.value,
                  }))
                }
                className="mt-2"
              >
                <ClockSlot />
              </TextField.Root>
            </label>
            {fieldErrors.startTime ? (
              <Text size="1" className="text-red-600">
                {fieldErrors.startTime}
              </Text>
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-600">
              End time
              <TextField.Root
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    endTime: (event as ChangeEvent<HTMLInputElement>).target.value,
                  }))
                }
                className="mt-2"
              >
                <ClockSlot />
              </TextField.Root>
            </label>
            {fieldErrors.endTime ? (
              <Text size="1" className="text-red-600">
                {fieldErrors.endTime}
              </Text>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <Text size="2" className="text-slate-500">
              Working days
            </Text>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    hasDay(day)
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Break start
              <TextField.Root
                type="time"
                value={form.breakTime?.start ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    breakTime: {
                      ...prev.breakTime,
                      start: (event as ChangeEvent<HTMLInputElement>).target.value,
                    },
                  }))
                }
                className="mt-2"
              >
                <ClockSlot />
              </TextField.Root>
            </label>
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Break end
              <TextField.Root
                type="time"
                value={form.breakTime?.end ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    breakTime: {
                      ...prev.breakTime,
                      end: (event as ChangeEvent<HTMLInputElement>).target.value,
                    },
                  }))
                }
                className="mt-2"
              >
                <ClockSlot />
              </TextField.Root>
            </label>
          </div>

          <div className="md:col-span-2 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Text size="2" className="text-slate-500">
              Features
            </Text>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!form.features?.whatsappReminder}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    features: { ...prev.features, whatsappReminder: event.target.checked },
                  }))
                }
              />
              WhatsApp reminders
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!form.features?.onlineBooking}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    features: { ...prev.features, onlineBooking: event.target.checked },
                  }))
                }
              />
              Online booking
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={!!form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Clinic is active
          </label>

          {formError ? (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {formError}
            </div>
          ) : null}

          <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
            <Button variant="soft" type="button" onClick={onCloseModal} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : mode === "edit"
                  ? "Save changes"
                  : "Create clinic"}
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ClinicModal;
