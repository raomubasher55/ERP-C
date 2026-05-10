import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Dialog, Heading, Text } from "@radix-ui/themes";
import { Link, useNavigate, useParams } from "react-router-dom";
import TopNav from "../components/TopNav";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type {
  Appointment,
  AppointmentPrescriptionUpdatePayload,
  AppointmentStatus,
  BillingService,
  Clinic,
  InventoryItem,
  Invoice,
  InvoiceCreatePayload,
} from "../types/api";
import {
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

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);

type DraftServiceLine = {
  serviceId: string;
  quantity: string;
};

type DraftMedicineLine = {
  inventoryItemId: string;
  quantity: string;
  unitPrice: string;
};

type DraftPrescription = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
};

const emptyPrescription = (): DraftPrescription => ({
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  notes: "",
});

const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<BillingService[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [serviceLines, setServiceLines] = useState<DraftServiceLine[]>([]);
  const [medicineLines, setMedicineLines] = useState<DraftMedicineLine[]>([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [prescriptionDrafts, setPrescriptionDrafts] = useState<DraftPrescription[]>([]);
  const [prescriptionSaving, setPrescriptionSaving] = useState(false);
  const [selectedDispenseLineIds, setSelectedDispenseLineIds] = useState<string[]>([]);

  const canStaffManage = !!user?.role && user.role !== "patient";

  useEffect(() => {
    const loadDetails = async () => {
      if (!token || !id) return;
      setLoading(true);
      setError(null);

      try {
        const appointmentRes = await api.get<{ appointment: Appointment }>(
          `/api/appointments/${id}`,
          token
        );
        setAppointment(appointmentRes.appointment);
        setPrescriptionDrafts(
          appointmentRes.appointment.prescriptions?.map((line) => ({
            name: line.name ?? "",
            dosage: line.dosage ?? "",
            frequency: line.frequency ?? "",
            duration: line.duration ?? "",
            notes: line.notes ?? "",
          })) ?? []
        );

        try {
          if (user?.role === "patient") {
            const clinicsRes = await api.get<{ clinics: Clinic[] }>("/api/clinics/public");
            const matchedClinic =
              clinicsRes.clinics.find((item) => item._id === appointmentRes.appointment.clinicId) ??
              null;
            setClinic(matchedClinic);
          } else {
            const clinicRes = await api.get<{ clinic: Clinic }>(
              `/api/clinics/${appointmentRes.appointment.clinicId}`,
              token
            );
            setClinic(clinicRes.clinic);
          }
        } catch {
          setClinic(null);
        }
      } catch (err) {
        const message = (err as { message?: string })?.message || "Unable to load appointment";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [id, token, user?.role]);

  useEffect(() => {
    const loadBilling = async () => {
      if (!token || !appointment) return;
      setBillingLoading(true);
      try {
        const invoiceRes = await api.get<{ invoices: Invoice[] }>(
          `/api/billing/invoices?appointmentId=${appointment._id}&limit=1`,
          token
        );
        setInvoice(invoiceRes.invoices[0] ?? null);

        if (canStaffManage) {
          const [serviceRes, inventoryRes] = await Promise.all([
            api.get<{ services: BillingService[] }>(
              `/api/billing/services?clinicId=${appointment.clinicId}&isActive=true&limit=100`,
              token
            ),
            api.get<{ items: InventoryItem[] }>(
              `/api/inventory/items?clinicId=${appointment.clinicId}&isActive=true&limit=100`,
              token
            ),
          ]);
          setServices(serviceRes.services);
          setInventoryItems(inventoryRes.items);
        } else {
          setServices([]);
          setInventoryItems([]);
        }
      } catch {
        setInvoice(null);
        setServices([]);
        setInventoryItems([]);
      } finally {
        setBillingLoading(false);
      }
    };

    loadBilling();
  }, [appointment, canStaffManage, token]);

  useEffect(() => {
    if (!invoiceDialogOpen) {
      setServiceLines([]);
      setMedicineLines([]);
      setInvoiceDiscount("0");
      setInvoiceNotes("");
      return;
    }

    if (services.length > 0 && serviceLines.length === 0 && medicineLines.length === 0) {
      setServiceLines([{ serviceId: services[0]._id, quantity: "1" }]);
    }
  }, [invoiceDialogOpen, medicineLines.length, serviceLines.length, services]);

  const updateStatus = async (status: AppointmentStatus) => {
    if (!token || !appointment) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await api.patch<{ appointment: Appointment }>(
        `/api/appointments/${appointment._id}`,
        { status },
        token
      );
      setAppointment(res.appointment);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to update appointment";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const canPatientCancel =
    user?.role === "patient" &&
    !!appointment &&
    isPatientCancelableStatus(appointment.status) &&
    new Date(appointment.scheduledAt).getTime() >= Date.now();

  const normalizedStatus = appointment ? normalizeAppointmentStatus(appointment.status) : null;

  const serviceMap = useMemo(
    () => new Map(services.map((service) => [service._id, service])),
    [services]
  );
  const inventoryMap = useMemo(
    () => new Map(inventoryItems.map((item) => [item._id, item])),
    [inventoryItems]
  );

  const draftInvoiceTotal = useMemo(() => {
    const serviceSubtotal = serviceLines.reduce((sum, line) => {
      const service = serviceMap.get(line.serviceId);
      const quantity = Number(line.quantity) || 0;
      return service ? sum + service.price * quantity : sum;
    }, 0);
    const medicineSubtotal = medicineLines.reduce((sum, line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
    const discount = Number(invoiceDiscount) || 0;
    return Math.max(serviceSubtotal + medicineSubtotal - discount, 0);
  }, [invoiceDiscount, medicineLines, serviceLines, serviceMap]);

  const pendingMedicineLines = useMemo(
    () =>
      invoice?.items.filter(
        (item) => item.type === "dispensed_medicine" && item.dispenseStatus !== "dispensed"
      ) ?? [],
    [invoice]
  );

  const createInvoice = async () => {
    if (!token || !appointment) return;

    const items: InvoiceCreatePayload["items"] = [
      ...serviceLines
        .map((line) => ({
          type: "service" as const,
          serviceId: line.serviceId,
          quantity: Number(line.quantity),
        }))
        .filter((line) => line.serviceId && Number.isFinite(line.quantity) && line.quantity > 0),
      ...medicineLines
        .map((line) => ({
          type: "dispensed_medicine" as const,
          inventoryItemId: line.inventoryItemId,
          quantity: Number(line.quantity),
          unitPrice: line.unitPrice.trim() === "" ? undefined : Number(line.unitPrice),
        }))
        .filter(
          (line) => line.inventoryItemId && Number.isFinite(line.quantity) && line.quantity > 0
        ),
    ];

    if (items.length === 0) {
      setError("Add at least one billable line.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post<{ invoice: Invoice }>(
        "/api/billing/invoices",
        {
          clinicId: appointment.clinicId,
          appointmentId: appointment._id,
          items,
          discount: Number(invoiceDiscount) || 0,
          notes: invoiceNotes || undefined,
        },
        token
      );
      setInvoice(res.invoice);
      setInvoiceDialogOpen(false);
      setSelectedDispenseLineIds([]);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to create invoice";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const savePrescriptions = async () => {
    if (!token || !appointment) return;
    setPrescriptionSaving(true);
    setError(null);

    const payload: AppointmentPrescriptionUpdatePayload = {
      prescriptions: prescriptionDrafts
        .map((line) => ({
          name: line.name.trim(),
          dosage: line.dosage.trim() || undefined,
          frequency: line.frequency.trim() || undefined,
          duration: line.duration.trim() || undefined,
          notes: line.notes.trim() || undefined,
        }))
        .filter((line) => line.name),
    };

    try {
      const res = await api.patch<{ appointment: Appointment }>(
        `/api/appointments/${appointment._id}/prescriptions`,
        payload,
        token
      );
      setAppointment(res.appointment);
      setPrescriptionDrafts(
        res.appointment.prescriptions.map((line) => ({
          name: line.name ?? "",
          dosage: line.dosage ?? "",
          frequency: line.frequency ?? "",
          duration: line.duration ?? "",
          notes: line.notes ?? "",
        }))
      );
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to save prescriptions";
      setError(message);
    } finally {
      setPrescriptionSaving(false);
    }
  };

  const dispenseSelectedLines = async () => {
    if (!token || !invoice || selectedDispenseLineIds.length === 0) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.patch<{ invoice: Invoice }>(
        `/api/billing/invoices/${invoice._id}/dispense`,
        { lineIds: selectedDispenseLineIds },
        token
      );
      setInvoice(res.invoice);
      setSelectedDispenseLineIds([]);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to dispense medicines";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleDispenseSelection = (lineId: string) => {
    setSelectedDispenseLineIds((current) =>
      current.includes(lineId)
        ? current.filter((entry) => entry !== lineId)
        : [...current, lineId]
    );
  };

  return (
    <div className="min-h-screen bg-app-gradient text-slate-950">
      <TopNav />
      <Dialog.Root open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <Dialog.Content className="app-scrollbar max-h-[85vh] w-[min(94vw,880px)] overflow-y-auto border border-slate-200 bg-white/95 p-6 shadow-[0_20px_80px_rgba(15,118,110,0.2)]">
          <Dialog.Title>
            <Heading size="6" className="font-display">
              Create visit invoice
            </Heading>
          </Dialog.Title>
          <Dialog.Description>
            <Text size="2" className="text-slate-500">
              Add billable services and clinic-store medicines. Prescription-only medicines stay
              outside the invoice.
            </Text>
          </Dialog.Description>

          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Heading size="4" className="font-display">
                    Services
                  </Heading>
                  <Text size="2" className="text-slate-500">
                    Consultations and procedures billed from the service catalog.
                  </Text>
                </div>
                <Button
                  variant="soft"
                  onClick={() =>
                    setServiceLines((current) => [
                      ...current,
                      { serviceId: services[0]?._id ?? "", quantity: "1" },
                    ])
                  }
                  disabled={services.length === 0}
                >
                  Add service
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {serviceLines.length === 0 ? (
                  <Text size="2" className="text-slate-500">
                    No service lines yet.
                  </Text>
                ) : null}
                {serviceLines.map((line, index) => (
                  <div
                    key={`service-${index}`}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_140px_auto]"
                  >
                    <select
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                      value={line.serviceId}
                      onChange={(event) =>
                        setServiceLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, serviceId: event.target.value } : entry
                          )
                        )
                      }
                    >
                      {services.map((service) => (
                        <option key={service._id} value={service._id}>
                          {service.name} - {formatMoney(service.price)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                      value={line.quantity}
                      onChange={(event) =>
                        setServiceLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, quantity: event.target.value } : entry
                          )
                        )
                      }
                    />
                    <Button
                      variant="soft"
                      color="red"
                      onClick={() =>
                        setServiceLines((current) =>
                          current.filter((_, entryIndex) => entryIndex !== index)
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Heading size="4" className="font-display">
                    Clinic-store medicines
                  </Heading>
                  <Text size="2" className="text-slate-500">
                    These are billed now and reduce stock only after explicit dispense.
                  </Text>
                </div>
                <Button
                  variant="soft"
                  onClick={() =>
                    setMedicineLines((current) => [
                      ...current,
                      {
                        inventoryItemId: inventoryItems[0]?._id ?? "",
                        quantity: "1",
                        unitPrice: String(inventoryItems[0]?.salePrice ?? ""),
                      },
                    ])
                  }
                  disabled={inventoryItems.length === 0}
                >
                  Add medicine
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {medicineLines.length === 0 ? (
                  <Text size="2" className="text-slate-500">
                    No medicine lines yet.
                  </Text>
                ) : null}
                {medicineLines.map((line, index) => (
                  <div
                    key={`medicine-${index}`}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_110px_140px_auto]"
                  >
                    <select
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                      value={line.inventoryItemId}
                      onChange={(event) => {
                        const selectedItem = inventoryMap.get(event.target.value);
                        setMedicineLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? {
                                  ...entry,
                                  inventoryItemId: event.target.value,
                                  unitPrice:
                                    entry.unitPrice !== ""
                                      ? entry.unitPrice
                                      : String(selectedItem?.salePrice ?? ""),
                                }
                              : entry
                          )
                        );
                      }}
                    >
                      {inventoryItems.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name} - stock {item.currentStock} {item.unit}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                      value={line.quantity}
                      onChange={(event) =>
                        setMedicineLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, quantity: event.target.value } : entry
                          )
                        )
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit price"
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                      value={line.unitPrice}
                      onChange={(event) =>
                        setMedicineLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, unitPrice: event.target.value } : entry
                          )
                        )
                      }
                    />
                    <Button
                      variant="soft"
                      color="red"
                      onClick={() =>
                        setMedicineLines((current) =>
                          current.filter((_, entryIndex) => entryIndex !== index)
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-600">
                Discount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  value={invoiceDiscount}
                  onChange={(event) => setInvoiceDiscount(event.target.value)}
                />
              </label>
              <label className="block text-sm text-slate-600">
                Notes
                <textarea
                  className="mt-2 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  value={invoiceNotes}
                  onChange={(event) => setInvoiceNotes(event.target.value)}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <Text size="2" className="text-slate-600">
                Draft total
              </Text>
              <Heading size="6" className="font-display">
                {formatMoney(draftInvoiceTotal)}
              </Heading>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="soft" onClick={() => setInvoiceDialogOpen(false)}>
                Cancel
              </Button>
              <Button disabled={actionLoading} onClick={createInvoice}>
                {actionLoading ? "Creating..." : "Create invoice"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Appointment Details
            </Text>
            <Heading size="8" className="font-display">
              {appointment?.patientName ?? "Appointment"}
            </Heading>
            <Text size="3" className="text-slate-500">
              Review appointment information, billing, prescriptions, and dispense status.
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="soft" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button asChild variant="soft">
              <Link to="/appointments">All appointments</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="mt-8 border border-slate-200 bg-white/80 p-6">
            <Text size="2" className="text-slate-500">
              Loading appointment...
            </Text>
          </Card>
        ) : null}

        {error ? (
          <Card className="mt-8 border border-red-200 bg-red-50 p-6">
            <Text size="2" className="text-red-600">
              {error}
            </Text>
          </Card>
        ) : null}

        {!loading && !error && appointment ? (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-3">
              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <Text size="2" className="text-slate-500">
                  Status
                </Text>
                <div className="mt-3">
                  <Badge
                    color={getAppointmentStatusBadgeColor(appointment.status)}
                    variant="soft"
                    size="3"
                  >
                    {formatAppointmentStatusLabel(appointment.status)}
                  </Badge>
                </div>
              </Card>
              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <Text size="2" className="text-slate-500">
                  Scheduled at
                </Text>
                <Heading size="5" className="mt-2 font-display">
                  {formatDateTime(appointment.scheduledAt)}
                </Heading>
              </Card>
              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <Text size="2" className="text-slate-500">
                  Appointment ID
                </Text>
                <Text size="2" className="mt-2 break-all text-slate-700">
                  {appointment._id}
                </Text>
              </Card>
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-2">
              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <Heading size="5" className="font-display">
                  Patient
                </Heading>
                <div className="mt-4 grid gap-4">
                  <div>
                    <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                      Name
                    </Text>
                    <Text size="3" className="mt-1 text-slate-800">
                      {appointment.patientName}
                    </Text>
                  </div>
                  <div>
                    <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                      Phone
                    </Text>
                    <Text size="3" className="mt-1 text-slate-800">
                      {appointment.patientPhone || "Not provided"}
                    </Text>
                  </div>
                  <div>
                    <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                      Notes
                    </Text>
                    <Text size="3" className="mt-1 text-slate-800">
                      {appointment.notes || "No notes"}
                    </Text>
                  </div>
                </div>
              </Card>

              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <Heading size="5" className="font-display">
                  Clinic
                </Heading>
                <div className="mt-4 grid gap-4">
                  <div>
                    <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                      Name
                    </Text>
                    <Text size="3" className="mt-1 text-slate-800">
                      {clinic?.name || "Clinic"}
                    </Text>
                  </div>
                  <div>
                    <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                      Contact
                    </Text>
                    <Text size="3" className="mt-1 text-slate-800">
                      {clinic?.phone || "Not available"}
                    </Text>
                  </div>
                  <div>
                    <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                      City
                    </Text>
                    <Text size="3" className="mt-1 text-slate-800">
                      {clinic?.city || "Not available"}
                    </Text>
                  </div>
                </div>
              </Card>
            </section>

            <section className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Heading size="5" className="font-display">
                      Billable visit items
                    </Heading>
                    <Text size="2" className="mt-2 text-slate-600">
                      Services and clinic-store medicines billed for this appointment.
                    </Text>
                  </div>
                  {canStaffManage && !invoice ? (
                    <Button disabled={billingLoading} onClick={() => setInvoiceDialogOpen(true)}>
                      Create invoice
                    </Button>
                  ) : null}
                  {invoice ? (
                    <div className="flex items-center gap-2">
                      <Button asChild variant="soft">
                        <Link to="/billing">Open billing</Link>
                      </Button>
                      <Button asChild variant="soft">
                        <Link to={`/billing/receipts/${invoice._id}`}>Receipt</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>

                {billingLoading ? (
                  <Text size="2" className="mt-4 text-slate-500">
                    Loading invoice...
                  </Text>
                ) : null}
                {!billingLoading && !invoice ? (
                  <Text size="2" className="mt-4 text-slate-500">
                    No invoice has been created for this appointment yet.
                  </Text>
                ) : null}
                {invoice ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                          Receipt
                        </Text>
                        <Text size="3" className="mt-1 text-slate-800">
                          {invoice.receiptNumber}
                        </Text>
                      </div>
                      <div>
                        <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                          Status
                        </Text>
                        <Badge
                          className="mt-2"
                          color={
                            invoice.paymentStatus === "paid"
                              ? "green"
                              : invoice.paymentStatus === "partial"
                                ? "amber"
                                : "red"
                          }
                          variant="soft"
                        >
                          {invoice.paymentStatus}
                        </Badge>
                      </div>
                      <div>
                        <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                          Total
                        </Text>
                        <Text size="3" className="mt-1 text-slate-800">
                          {formatMoney(invoice.total)}
                        </Text>
                      </div>
                      <div>
                        <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                          Paid
                        </Text>
                        <Text size="3" className="mt-1 text-slate-800">
                          {formatMoney(invoice.paidAmount)}
                        </Text>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {invoice.items.map((item) => (
                        <div
                          key={item.lineId}
                          className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Text size="2" className="font-semibold text-slate-900">
                                  {item.displayName}
                                </Text>
                                <Badge
                                  variant="soft"
                                  color={item.type === "service" ? "gray" : "blue"}
                                >
                                  {item.type === "service" ? "Service" : "Clinic medicine"}
                                </Badge>
                                {item.type === "dispensed_medicine" ? (
                                  <Badge
                                    variant="soft"
                                    color={
                                      item.dispenseStatus === "dispensed" ? "green" : "amber"
                                    }
                                  >
                                    {item.dispenseStatus === "dispensed"
                                      ? "Dispensed"
                                      : "Pending dispense"}
                                  </Badge>
                                ) : null}
                              </div>
                              <Text size="1" className="text-slate-500">
                                Qty {item.quantity} - {formatMoney(item.unitPrice)} each
                              </Text>
                            </div>
                            <Text size="2" className="font-semibold text-slate-900">
                              {formatMoney(item.lineTotal)}
                            </Text>
                          </div>
                          {item.type === "dispensed_medicine" && item.dispenseStatus !== "dispensed" && canStaffManage ? (
                            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                checked={selectedDispenseLineIds.includes(item.lineId)}
                                onChange={() => toggleDispenseSelection(item.lineId)}
                              />
                              Select for dispense
                            </label>
                          ) : null}
                          {item.type === "dispensed_medicine" && item.dispenseStatus === "dispensed" ? (
                            <Text size="1" className="mt-2 text-emerald-700">
                              Dispensed {item.dispensedAt ? formatDateTime(item.dispensedAt) : ""}
                            </Text>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {canStaffManage && pendingMedicineLines.length > 0 ? (
                      <div className="flex justify-end">
                        <Button
                          disabled={actionLoading || selectedDispenseLineIds.length === 0}
                          onClick={dispenseSelectedLines}
                        >
                          {actionLoading
                            ? "Updating..."
                            : `Mark ${selectedDispenseLineIds.length || "selected"} dispensed`}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>

              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Heading size="5" className="font-display">
                      Prescription-only medicines
                    </Heading>
                    <Text size="2" className="mt-2 text-slate-600">
                      Recommended medicines not purchased from the clinic store.
                    </Text>
                  </div>
                  {canStaffManage ? (
                    <Button
                      variant="soft"
                      onClick={() =>
                        setPrescriptionDrafts((current) => [...current, emptyPrescription()])
                      }
                    >
                      Add prescription
                    </Button>
                  ) : null}
                </div>

                {canStaffManage ? (
                  <div className="mt-4 space-y-3">
                    {prescriptionDrafts.length === 0 ? (
                      <Text size="2" className="text-slate-500">
                        No prescription-only medicines yet.
                      </Text>
                    ) : null}
                    {prescriptionDrafts.map((line, index) => (
                      <div
                        key={`prescription-${index}`}
                        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                            placeholder="Medicine name"
                            value={line.name}
                            onChange={(event) =>
                              setPrescriptionDrafts((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, name: event.target.value }
                                    : entry
                                )
                              )
                            }
                          />
                          <input
                            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                            placeholder="Dosage"
                            value={line.dosage}
                            onChange={(event) =>
                              setPrescriptionDrafts((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, dosage: event.target.value }
                                    : entry
                                )
                              )
                            }
                          />
                          <input
                            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                            placeholder="Frequency"
                            value={line.frequency}
                            onChange={(event) =>
                              setPrescriptionDrafts((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, frequency: event.target.value }
                                    : entry
                                )
                              )
                            }
                          />
                          <input
                            className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                            placeholder="Duration"
                            value={line.duration}
                            onChange={(event) =>
                              setPrescriptionDrafts((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, duration: event.target.value }
                                    : entry
                                )
                              )
                            }
                          />
                        </div>
                        <textarea
                          className="min-h-20 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                          placeholder="Notes"
                          value={line.notes}
                          onChange={(event) =>
                            setPrescriptionDrafts((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, notes: event.target.value }
                                  : entry
                              )
                            )
                          }
                        />
                        <div className="flex justify-end">
                          <Button
                            variant="soft"
                            color="red"
                            onClick={() =>
                              setPrescriptionDrafts((current) =>
                                current.filter((_, entryIndex) => entryIndex !== index)
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <Button disabled={prescriptionSaving} onClick={savePrescriptions}>
                        {prescriptionSaving ? "Saving..." : "Save prescriptions"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {appointment.prescriptions.length === 0 ? (
                      <Text size="2" className="text-slate-500">
                        No prescription-only medicines recorded.
                      </Text>
                    ) : (
                      appointment.prescriptions.map((line, index) => (
                        <div
                          key={`prescription-view-${index}`}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <Text size="2" className="font-semibold text-slate-900">
                            {line.name}
                          </Text>
                          <Text size="1" className="mt-1 text-slate-500">
                            {[line.dosage, line.frequency, line.duration]
                              .filter(Boolean)
                              .join(" - ") || "No structured dosing"}
                          </Text>
                          {line.notes ? (
                            <Text size="2" className="mt-2 text-slate-600">
                              {line.notes}
                            </Text>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            </section>

            <section className="mt-8">
              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <Heading size="5" className="font-display">
                  Timeline
                </Heading>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                      Created at
                    </Text>
                    <Text size="3" className="mt-1 text-slate-800">
                      {formatDateTime(appointment.createdAt)}
                    </Text>
                  </div>
                  <div>
                    <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                      Last updated
                    </Text>
                    <Text size="3" className="mt-1 text-slate-800">
                      {formatDateTime(appointment.updatedAt)}
                    </Text>
                  </div>
                </div>
              </Card>
            </section>

            {canPatientCancel || canStaffManage ? (
              <section className="mt-8">
                <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                  <Heading size="5" className="font-display">
                    Actions
                  </Heading>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {canPatientCancel ? (
                      <Button
                        variant="soft"
                        color="red"
                        disabled={actionLoading}
                        onClick={() => updateStatus("cancelled")}
                      >
                        Cancel appointment
                      </Button>
                    ) : null}
                    {canStaffManage ? (
                      <>
                        {normalizedStatus === "pending" ? (
                          <>
                            <Button
                              variant="soft"
                              disabled={actionLoading}
                              onClick={() => updateStatus("confirmed")}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="soft"
                              color="red"
                              disabled={actionLoading}
                              onClick={() => updateStatus("cancelled")}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : null}
                        {normalizedStatus === "confirmed" ? (
                          <>
                            <Button
                              variant="soft"
                              disabled={actionLoading}
                              onClick={() => updateStatus("completed")}
                            >
                              Mark completed
                            </Button>
                            <Button
                              variant="soft"
                              color="red"
                              disabled={actionLoading}
                              onClick={() => updateStatus("cancelled")}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="soft"
                              color="gray"
                              disabled={actionLoading}
                              onClick={() => updateStatus("no_show")}
                            >
                              Mark no show
                            </Button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </Card>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default AppointmentDetails;
