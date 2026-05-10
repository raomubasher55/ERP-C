import {
  Badge,
  Button,
  Card,
  Heading,
  Select,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useAuth } from "../context/AuthContext";
import TopNav from "../components/TopNav";
import { api } from "../lib/api";
import type {
  Appointment,
  Clinic,
  PatientProfileUpdatePayload,
  User,
} from "../types/api";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AppointmentModal from "../components/AppointmentModal";
import { Link } from "react-router-dom";
import {
  formatAppointmentStatusLabel,
  getAppointmentStatusBadgeColor,
  isPatientCancelableStatus,
  normalizeAppointmentStatus,
} from "../lib/appointment";

type ProfileFormState = {
  name: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  phone: string;
  address: string;
  city: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  treatment: boolean;
  dataProcessing: boolean;
  marketing: boolean;
  smsReminders: boolean;
};

const createProfileForm = (currentUser?: User | null): ProfileFormState => ({
  name: currentUser?.name ?? "",
  dateOfBirth: currentUser?.patientProfile?.dateOfBirth?.slice(0, 10) ?? "",
  gender: currentUser?.patientProfile?.gender ?? "prefer_not_to_say",
  phone: currentUser?.contact?.phone ?? "",
  address: currentUser?.contact?.address ?? "",
  city: currentUser?.contact?.city ?? "",
  emergencyName: currentUser?.contact?.emergencyContact?.name ?? "",
  emergencyPhone: currentUser?.contact?.emergencyContact?.phone ?? "",
  emergencyRelation: currentUser?.contact?.emergencyContact?.relation ?? "",
  treatment: currentUser?.consent?.treatment ?? false,
  dataProcessing: currentUser?.consent?.dataProcessing ?? false,
  marketing: currentUser?.consent?.marketing ?? false,
  smsReminders: currentUser?.consent?.smsReminders ?? false,
});

const PatientDashboard = () => {
  const { user, token, refreshUser } = useAuth();
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
  const [profileUser, setProfileUser] = useState<User | null>(user);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => createProfileForm(user));

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

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      setProfileLoading(true);
      setProfileError(null);
      try {
        const res = await api.get<{ user: User }>("/api/users/me/profile", token);
        setProfileUser(res.user);
      } catch (err) {
        const message =
          (err as { message?: string })?.message || "Unable to load patient profile";
        setProfileError(message);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  useEffect(() => {
    const currentUser = profileUser ?? user;
    setProfileForm(createProfileForm(currentUser));
  }, [profileUser, user]);

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

  const availableClinics = useMemo(() => clinics.filter((c) => c.isActive), [clinics]);

  const clinicNameById = useMemo(() => {
    const map = new Map<string, string>();
    clinics.forEach((clinic) => map.set(clinic._id, clinic.name));
    return map;
  }, [clinics]);

  const currentUser = profileUser ?? user;
  const now = new Date();
  const upcomingCount = appointments.filter((appt) => {
    const normalized = normalizeAppointmentStatus(appt.status);
    return (
      (normalized === "pending" || normalized === "confirmed") &&
      new Date(appt.scheduledAt).getTime() >= now.getTime()
    );
  }).length;

  const profileCompletion = useMemo(() => {
    const completed = [
      profileForm.name,
      profileForm.dateOfBirth,
      profileForm.phone,
      profileForm.city,
      profileForm.address,
      profileForm.emergencyName,
      profileForm.emergencyPhone,
      profileForm.emergencyRelation,
    ].filter((value) => value.trim().length > 0).length;

    return Math.round((completed / 8) * 100);
  }, [
    profileForm.address,
    profileForm.city,
    profileForm.dateOfBirth,
    profileForm.emergencyName,
    profileForm.emergencyPhone,
    profileForm.emergencyRelation,
    profileForm.name,
    profileForm.phone,
  ]);

  const consentReady = profileForm.treatment && profileForm.dataProcessing;

  const updateProfileField = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K]
  ) => {
    setProfileForm((current) => ({ ...current, [key]: value }));
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

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setProfileSaving(true);
    setProfileError(null);

    const payload: PatientProfileUpdatePayload = {
      name: profileForm.name,
      patientProfile: {
        dateOfBirth: profileForm.dateOfBirth || undefined,
        gender: profileForm.gender,
      },
      contact: {
        phone: profileForm.phone || undefined,
        address: profileForm.address || undefined,
        city: profileForm.city || undefined,
        emergencyContact: {
          name: profileForm.emergencyName || undefined,
          phone: profileForm.emergencyPhone || undefined,
          relation: profileForm.emergencyRelation || undefined,
        },
      },
      consent: {
        treatment: profileForm.treatment,
        dataProcessing: profileForm.dataProcessing,
        marketing: profileForm.marketing,
        smsReminders: profileForm.smsReminders,
      },
    };

    try {
      const res = await api.patch<{ user: User }>("/api/users/me/profile", payload, token);
      setProfileUser(res.user);
      await refreshUser();
      setToast({ message: "Patient profile saved", type: "success" });
    } catch (err) {
      const message =
        (err as { message?: string })?.message || "Unable to save patient profile";
      setProfileError(message);
      setToast({ message, type: "error" });
    } finally {
      setProfileSaving(false);
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
          patientName={currentUser?.name}
          onClose={() => setSelectedClinic(null)}
          onBooked={() => {
            setToast({ message: "Appointment requested", type: "success" });
            setSelectedClinic(null);
            loadAppointments();
          }}
          onError={(message) => setToast({ message, type: "error" })}
        />
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Patient Portal
            </Text>
            <Heading size="8" className="font-display">
              {currentUser ? `Hi, ${currentUser.name}` : "Welcome"}
            </Heading>
            <Text size="3" className="text-slate-500">
              Manage your profile, contact details, consent, and appointments from one place.
            </Text>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            { label: "Upcoming visits", value: String(upcomingCount) },
            { label: "Profile complete", value: `${profileCompletion}%` },
            { label: "Consent status", value: consentReady ? "Ready" : "Pending" },
            {
              label: "Emergency contact",
              value: profileForm.emergencyPhone.trim() ? "Added" : "Missing",
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,118,110,0.08)]"
            >
              <Text size="2" className="text-slate-500">
                {stat.label}
              </Text>
              <Heading size="6" className="font-display text-slate-900">
                {stat.value}
              </Heading>
            </Card>
          ))}
        </section>

        <section className="mt-10 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Heading size="5" className="font-display">
                  Patient profile
                </Heading>
                <Text size="3" className="mt-2 text-slate-600">
                  Keep your core profile, contact details, and consent records current.
                </Text>
              </div>
              <Badge color={consentReady ? "green" : "amber"} variant="soft">
                {consentReady ? "Consents recorded" : "Consents incomplete"}
              </Badge>
            </div>

            {profileLoading ? (
              <Text size="2" className="mt-4 text-slate-500">
                Loading profile...
              </Text>
            ) : null}
            {profileError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {profileError}
              </div>
            ) : null}

            <form className="mt-6 space-y-6" onSubmit={saveProfile}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  Full name
                  <TextField.Root
                    className="mt-2"
                    value={profileForm.name}
                    onChange={(event) => updateProfileField("name", event.target.value)}
                    placeholder="Patient name"
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  Date of birth
                  <TextField.Root
                    className="mt-2"
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(event) => updateProfileField("dateOfBirth", event.target.value)}
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  Gender
                  <Select.Root
                    value={profileForm.gender}
                    onValueChange={(value) =>
                      updateProfileField(
                        "gender",
                        value as ProfileFormState["gender"]
                      )
                    }
                  >
                    <Select.Trigger className="mt-2" />
                    <Select.Content>
                      <Select.Item value="prefer_not_to_say">Prefer not to say</Select.Item>
                      <Select.Item value="male">Male</Select.Item>
                      <Select.Item value="female">Female</Select.Item>
                      <Select.Item value="other">Other</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </label>
                <label className="block text-sm text-slate-600">
                  Phone
                  <TextField.Root
                    className="mt-2"
                    value={profileForm.phone}
                    onChange={(event) => updateProfileField("phone", event.target.value)}
                    placeholder="+92-300-1234567"
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  City
                  <TextField.Root
                    className="mt-2"
                    value={profileForm.city}
                    onChange={(event) => updateProfileField("city", event.target.value)}
                    placeholder="Lahore"
                  />
                </label>
                <label className="block text-sm text-slate-600 md:col-span-2">
                  Address
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-400"
                    value={profileForm.address}
                    onChange={(event) => updateProfileField("address", event.target.value)}
                    placeholder="Home address"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <Heading size="4" className="font-display">
                  Emergency contact
                </Heading>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="block text-sm text-slate-600">
                    Contact name
                    <TextField.Root
                      className="mt-2"
                      value={profileForm.emergencyName}
                      onChange={(event) => updateProfileField("emergencyName", event.target.value)}
                      placeholder="Family member"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    Contact phone
                    <TextField.Root
                      className="mt-2"
                      value={profileForm.emergencyPhone}
                      onChange={(event) => updateProfileField("emergencyPhone", event.target.value)}
                      placeholder="+92-300-0000000"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    Relation
                    <TextField.Root
                      className="mt-2"
                      value={profileForm.emergencyRelation}
                      onChange={(event) =>
                        updateProfileField("emergencyRelation", event.target.value)
                      }
                      placeholder="Brother / Spouse"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <Heading size="4" className="font-display">
                  Consent preferences
                </Heading>
                <Text size="2" className="mt-2 text-slate-600">
                  Treatment and data processing consent are required before clinics can fully use
                  your patient record.
                </Text>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[
                    {
                      key: "treatment",
                      label: "Consent to treatment",
                    },
                    {
                      key: "dataProcessing",
                      label: "Consent to data processing",
                    },
                    {
                      key: "marketing",
                      label: "Allow clinic marketing updates",
                    },
                    {
                      key: "smsReminders",
                      label: "Allow SMS appointment reminders",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-emerald-600"
                        checked={profileForm[item.key as keyof Pick<
                          ProfileFormState,
                          "treatment" | "dataProcessing" | "marketing" | "smsReminders"
                        >]}
                        onChange={(event) =>
                          updateProfileField(
                            item.key as keyof Pick<
                              ProfileFormState,
                              "treatment" | "dataProcessing" | "marketing" | "smsReminders"
                            >,
                            event.target.checked
                          )
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
                {currentUser?.consent?.updatedAt ? (
                  <Text size="1" className="mt-3 text-slate-500">
                    Consent last updated:{" "}
                    {new Date(currentUser.consent.updatedAt).toLocaleString()}
                  </Text>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Text size="2" className="text-slate-500">
                  Profile completeness: {profileCompletion}%.
                </Text>
                <Button type="submit" size="3" disabled={profileSaving || profileLoading}>
                  {profileSaving ? "Saving..." : "Save patient profile"}
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="border border-emerald-100 bg-emerald-50/60 p-6">
              <Heading size="5" className="font-display">
                Available clinics
              </Heading>
              <Text size="3" className="mt-2 text-slate-600">
                Choose a clinic to request an appointment.
              </Text>
              <div className="app-scrollbar mt-4 max-h-[18rem] space-y-3 overflow-y-auto pr-2">
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
                          {clinic.city} - {clinic.phone}
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

            <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
              <Heading size="5" className="font-display">
                My appointments
              </Heading>
              <Text size="3" className="mt-2 text-slate-600">
                Track your upcoming visits and manage bookings.
              </Text>

              <div className="app-scrollbar mt-4 max-h-[18rem] space-y-3 overflow-y-auto pr-2">
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
                    const clinicName = clinicNameById.get(appointment.clinicId) ?? "Clinic";
                    const scheduled = new Date(appointment.scheduledAt);
                    const isFuture = scheduled.getTime() >= now.getTime();
                    return (
                      <div
                        key={appointment._id}
                        className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <Text size="2" className="font-semibold text-slate-800">
                              {clinicName}
                            </Text>
                            <Text size="1" className="text-slate-500">
                              {scheduled.toLocaleString()}
                            </Text>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              color={getAppointmentStatusBadgeColor(appointment.status)}
                              variant="soft"
                            >
                              {formatAppointmentStatusLabel(appointment.status)}
                            </Badge>
                            <Button asChild size="2" variant="soft">
                              <Link to={`/appointments/${appointment._id}`}>Details</Link>
                            </Button>
                            {isPatientCancelableStatus(appointment.status) && isFuture ? (
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
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PatientDashboard;
