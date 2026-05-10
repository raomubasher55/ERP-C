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
import TopNav from "../components/TopNav";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type {
  BillingService,
  BillingServiceCreatePayload,
  Clinic,
  InventoryItem,
  Invoice,
  InvoiceUpdatePayload,
} from "../types/api";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);

type InvoiceEditLine = {
  lineId?: string;
  type: "service" | "dispensed_medicine";
  serviceId: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: string;
  locked: boolean;
};

type InvoiceEditModalProps = {
  invoice: Invoice | null;
  open: boolean;
  services: BillingService[];
  inventoryItems: InventoryItem[];
  token: string;
  onClose: () => void;
  onSaved: () => void;
};

const InvoiceEditModal = ({
  invoice,
  open,
  services,
  inventoryItems,
  token,
  onClose,
  onSaved,
}: InvoiceEditModalProps) => {
  const [items, setItems] = useState<InvoiceEditLine[]>([]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoice) {
      setItems([]);
      setDiscount("0");
      setNotes("");
      setError(null);
      setSubmitting(false);
      return;
    }

    setItems(
      invoice.items.map((item) => ({
        lineId: item.lineId,
        type: item.type,
        serviceId: item.serviceId ?? "",
        inventoryItemId: item.inventoryItemId ?? "",
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        locked: item.type === "dispensed_medicine" && item.dispenseStatus === "dispensed",
      }))
    );
    setDiscount(String(invoice.discount ?? 0));
    setNotes(invoice.notes ?? "");
    setError(null);
    setSubmitting(false);
  }, [invoice]);

  const servicesMap = useMemo(
    () => new Map(services.map((service) => [service._id, service])),
    [services]
  );
  const inventoryMap = useMemo(
    () => new Map(inventoryItems.map((item) => [item._id, item])),
    [inventoryItems]
  );

  const computedSubtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (item.type === "service") {
          const service = servicesMap.get(item.serviceId);
          if (!service) return sum;
          return sum + service.price * item.quantity;
        }
        const unitPrice = Number(item.unitPrice) || 0;
        return sum + unitPrice * item.quantity;
      }, 0),
    [inventoryMap, items, servicesMap]
  );

  const computedDiscount = useMemo(() => {
    const parsed = Number(discount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [discount]);

  const computedTotal = Math.max(computedSubtotal - computedDiscount, 0);

  const updateItem = (index: number, updates: Partial<InvoiceEditLine>) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      )
    );
  };

  const addItem = () => {
    const fallbackServiceId = services[0]?._id ?? "";
    setItems((current) => [
      ...current,
      {
        type: "service",
        serviceId: fallbackServiceId,
        inventoryItemId: "",
        quantity: 1,
        unitPrice: "",
        locked: false,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const submit = async () => {
    if (!invoice) return;

    const normalizedItems = items
      .map((item) =>
        item.type === "service"
          ? {
              lineId: item.lineId,
              type: "service" as const,
              serviceId: item.serviceId,
              quantity: Number(item.quantity),
            }
          : {
              lineId: item.lineId,
              type: "dispensed_medicine" as const,
              inventoryItemId: item.inventoryItemId,
              quantity: Number(item.quantity),
              unitPrice: item.unitPrice.trim() === "" ? undefined : Number(item.unitPrice),
            }
      )
      .filter((item) =>
        item.type === "service"
          ? item.serviceId && item.quantity > 0
          : item.inventoryItemId && item.quantity > 0
      );

    if (normalizedItems.length === 0) {
      setError("Add at least one invoice item.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: InvoiceUpdatePayload = {
        items: normalizedItems,
        discount: computedDiscount,
        notes: notes.trim(),
      };

      await api.patch(`/api/billing/invoices/${invoice._id}`, payload, token);
      onSaved();
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to update invoice";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <Dialog.Content className="app-scrollbar max-h-[85vh] w-[min(94vw,720px)] overflow-y-auto border border-slate-200 bg-white/95 p-6 shadow-[0_20px_80px_rgba(15,118,110,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Dialog.Title>
              <Heading size="6" className="font-display">
                Edit invoice
              </Heading>
            </Dialog.Title>
            <Dialog.Description>
              <Text size="2" className="text-slate-500">
                {invoice
                  ? `${invoice.patientName} - ${invoice.receiptNumber}`
                  : "Update invoice items, discount, and notes."}
              </Text>
            </Dialog.Description>
          </div>
          <Button variant="soft" onClick={onClose} disabled={submitting}>
            Close
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Heading size="4" className="font-display">
                  Invoice items
                </Heading>
                <Text size="2" className="text-slate-500">
                  Adjust services and quantities, then save the updated invoice.
                </Text>
              </div>
              <Button
                variant="soft"
                onClick={addItem}
                disabled={services.length === 0}
              >
                Add item
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {items.length === 0 ? (
                <Text size="2" className="text-slate-500">
                  No items selected yet.
                </Text>
              ) : null}

              {items.map((item, index) => {
                const selectedService = servicesMap.get(item.serviceId);
                const selectedInventoryItem = inventoryMap.get(item.inventoryItemId);
                const lineTotal =
                  item.type === "service"
                    ? (selectedService?.price ?? 0) * item.quantity
                    : (Number(item.unitPrice) || 0) * item.quantity;

                return (
                  <div
                    key={`${item.lineId ?? item.serviceId ?? item.inventoryItemId}-${index}`}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[0.7fr_1.3fr_0.45fr_0.6fr_0.55fr_auto]"
                  >
                    <label className="grid gap-2 text-sm text-slate-600">
                      Type
                      <Select.Root
                        value={item.type}
                        onValueChange={(value) =>
                          updateItem(index, {
                            type: value as InvoiceEditLine["type"],
                            serviceId: value === "service" ? services[0]?._id ?? "" : "",
                            inventoryItemId:
                              value === "dispensed_medicine" ? inventoryItems[0]?._id ?? "" : "",
                            unitPrice:
                              value === "dispensed_medicine"
                                ? String(inventoryItems[0]?.salePrice ?? "")
                                : "",
                          })
                        }
                        disabled={item.locked}
                      >
                        <Select.Trigger />
                        <Select.Content>
                          <Select.Item value="service">Service</Select.Item>
                          <Select.Item value="dispensed_medicine">Clinic medicine</Select.Item>
                        </Select.Content>
                      </Select.Root>
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      {item.type === "service" ? "Service" : "Medicine"}
                      {item.type === "service" ? (
                        <Select.Root
                          value={item.serviceId}
                          onValueChange={(value) => updateItem(index, { serviceId: value })}
                          disabled={item.locked}
                        >
                          <Select.Trigger />
                          <Select.Content>
                            {services.map((service) => (
                              <Select.Item key={service._id} value={service._id}>
                                {service.name}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      ) : (
                        <Select.Root
                          value={item.inventoryItemId}
                          onValueChange={(value) =>
                            updateItem(index, {
                              inventoryItemId: value,
                              unitPrice:
                                item.locked
                                  ? item.unitPrice
                                  : String(inventoryMap.get(value)?.salePrice ?? item.unitPrice),
                            })
                          }
                          disabled={item.locked}
                        >
                          <Select.Trigger />
                          <Select.Content>
                            {inventoryItems.map((inventoryItem) => (
                              <Select.Item key={inventoryItem._id} value={inventoryItem._id}>
                                {inventoryItem.name}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      )}
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      Qty
                      <TextField.Root
                        type="number"
                        min="1"
                        step="1"
                        value={String(item.quantity)}
                        disabled={item.locked}
                        onChange={(event) =>
                          updateItem(index, {
                            quantity: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-600">
                      Rate
                      {item.type === "service" ? (
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-[9px] text-sm text-slate-700">
                          {formatMoney(selectedService?.price ?? 0)}
                        </div>
                      ) : (
                        <TextField.Root
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          disabled={item.locked}
                          onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
                        />
                      )}
                    </label>

                    <div className="grid gap-2 text-sm text-slate-600">
                      <span>Line total</span>
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-[9px] text-sm text-slate-700">
                        {formatMoney(lineTotal)}
                      </div>
                      {item.type === "dispensed_medicine" ? (
                        <Text size="1" className="text-slate-500">
                          {item.locked
                            ? "Dispensed line locked"
                            : `Stock ${selectedInventoryItem?.currentStock ?? 0} ${selectedInventoryItem?.unit ?? ""}`}
                        </Text>
                      ) : null}
                    </div>

                    <div className="flex items-end justify-end">
                      <Button
                        variant="soft"
                        color="red"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1 || item.locked}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Discount
              <TextField.Root
                className="mt-2"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </label>

            <label className="block text-sm text-slate-600">
              Notes
              <textarea
                className="mt-2 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-3">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-3">
                <span>Subtotal</span>
                <span className="font-semibold">{formatMoney(computedSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-3">
                <span>Discount</span>
                <span className="font-semibold">{formatMoney(computedDiscount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-3">
                <span>Total</span>
                <span className="font-semibold">{formatMoney(computedTotal)}</span>
              </div>
            </div>
          </div>

          {error ? (
            <Text size="2" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600">
              {error}
            </Text>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button variant="soft" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={submitting || (services.length === 0 && inventoryItems.length === 0)}
            >
              {submitting ? "Saving..." : "Save invoice"}
            </Button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
};

const Billing = () => {
  const { token, user } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [services, setServices] = useState<BillingService[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [serviceForm, setServiceForm] = useState<BillingServiceCreatePayload>({
    clinicId: "",
    name: "",
    code: "",
    description: "",
    price: 0,
    isActive: true,
  });
  const [editingService, setEditingService] = useState<BillingService | null>(null);
  const [savingService, setSavingService] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    "all" | "unpaid" | "partial" | "paid"
  >("all");

  const canManageCatalog = user?.role === "admin" || user?.role === "clinic_owner" || user?.role === "clinic";

  const loadClinics = useCallback(async () => {
    if (!token) return;
    const res = await api.get<{ clinics: Clinic[] }>("/api/clinics", token);
    setClinics(res.clinics);
    if (!selectedClinicId && res.clinics.length > 0) {
      setSelectedClinicId(res.clinics[0]._id);
    }
  }, [selectedClinicId, token]);

  const loadBilling = useCallback(async () => {
    if (!token || !selectedClinicId) return;
    setLoading(true);
    setError(null);
    try {
      const serviceRes = await api.get<{ services: BillingService[] }>(
        `/api/billing/services?clinicId=${selectedClinicId}`,
        token
      );
      const inventoryRes = await api.get<{ items: InventoryItem[] }>(
        `/api/inventory/items?clinicId=${selectedClinicId}&isActive=true&limit=100`,
        token
      );
      const invoicesPath =
        paymentStatusFilter === "all"
          ? `/api/billing/invoices?clinicId=${selectedClinicId}`
          : `/api/billing/invoices?clinicId=${selectedClinicId}&paymentStatus=${paymentStatusFilter}`;
      const invoiceRes = await api.get<{ invoices: Invoice[] }>(invoicesPath, token);
      setServices(serviceRes.services);
      setInventoryItems(inventoryRes.items);
      setInvoices(invoiceRes.invoices);
      setServiceForm((current) => ({ ...current, clinicId: selectedClinicId }));
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to load billing data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [paymentStatusFilter, selectedClinicId, token]);

  useEffect(() => {
    if (token) {
      loadClinics().catch(() => {
        setError("Unable to load clinics");
      });
    }
  }, [loadClinics, token]);

  useEffect(() => {
    if (selectedClinicId) {
      loadBilling();
    }
  }, [loadBilling, selectedClinicId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const resetServiceForm = () => {
    setEditingService(null);
    setServiceForm({
      clinicId: selectedClinicId,
      name: "",
      code: "",
      description: "",
      price: 0,
      isActive: true,
    });
  };

  const submitService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedClinicId) return;

    setSavingService(true);
    try {
      if (editingService) {
        await api.patch(`/api/billing/services/${editingService._id}`, {
          name: serviceForm.name,
          code: serviceForm.code || undefined,
          description: serviceForm.description || undefined,
          price: Number(serviceForm.price),
          isActive: serviceForm.isActive,
        }, token);
        setToast({ message: "Service updated", type: "success" });
      } else {
        await api.post("/api/billing/services", {
          clinicId: selectedClinicId,
          name: serviceForm.name,
          code: serviceForm.code || undefined,
          description: serviceForm.description || undefined,
          price: Number(serviceForm.price),
          isActive: serviceForm.isActive,
        }, token);
        setToast({ message: "Service created", type: "success" });
      }

      resetServiceForm();
      await loadBilling();
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to save service";
      setToast({ message, type: "error" });
    } finally {
      setSavingService(false);
    }
  };

  const openEditService = (service: BillingService) => {
    setEditingService(service);
    setServiceForm({
      clinicId: service.clinicId,
      name: service.name,
      code: service.code ?? "",
      description: service.description ?? "",
      price: service.price,
      isActive: service.isActive,
    });
  };

  const removeService = async (serviceId: string) => {
    if (!token) return;
    try {
      await api.delete(`/api/billing/services/${serviceId}`, token);
      setToast({ message: "Service archived", type: "success" });
      await loadBilling();
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to archive service";
      setToast({ message, type: "error" });
    }
  };

  const revenueSummary = useMemo(() => {
    const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const paid = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    return {
      total,
      paid,
      pending: Math.max(total - paid, 0),
    };
  }, [invoices]);

  const submitPayment = async () => {
    if (!token || !paymentInvoice) return;
    try {
      await api.patch(
        `/api/billing/invoices/${paymentInvoice._id}`,
        {
          paidAmount: Number(paymentAmount),
          notes: paymentNotes || undefined,
        },
        token
      );
      setToast({ message: "Invoice payment updated", type: "success" });
      setPaymentInvoice(null);
      await loadBilling();
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to update invoice";
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
        <InvoiceEditModal
          invoice={editingInvoice}
          open={!!editingInvoice}
          services={services}
          inventoryItems={inventoryItems}
          token={token}
          onClose={() => setEditingInvoice(null)}
          onSaved={async () => {
            setEditingInvoice(null);
            setToast({ message: "Invoice updated", type: "success" });
            await loadBilling();
          }}
        />
      ) : null}

      <Dialog.Root open={!!paymentInvoice} onOpenChange={(open) => (!open ? setPaymentInvoice(null) : null)}>
        <Dialog.Content className="app-scrollbar max-h-[80vh] w-[min(92vw,520px)] overflow-y-auto border border-slate-200 bg-white/95 p-6 shadow-[0_20px_80px_rgba(15,118,110,0.2)]">
          <Dialog.Title>
            <Heading size="6" className="font-display">
              Record payment
            </Heading>
          </Dialog.Title>
          <Dialog.Description>
            <Text size="2" className="text-slate-500">
              {paymentInvoice ? `${paymentInvoice.patientName} - ${paymentInvoice.receiptNumber}` : ""}
            </Text>
          </Dialog.Description>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-slate-600">
              Paid amount
              <TextField.Root
                className="mt-2"
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </label>
            <label className="block text-sm text-slate-600">
              Notes
              <textarea
                className="mt-2 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-3">
              <Button variant="soft" onClick={() => setPaymentInvoice(null)}>
                Cancel
              </Button>
              <Button onClick={submitPayment}>Save payment</Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Billing
            </Text>
            <Heading size="8" className="font-display">
              Services, invoices, and receipts
            </Heading>
            <Text size="3" className="text-slate-500">
              Manage clinic pricing and track invoice collection per visit.
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="soft">
              <Link to="/inventory">Inventory</Link>
            </Button>
            <Button asChild variant="soft">
              <Link to="/appointments">Appointments</Link>
            </Button>
            <div className="min-w-[220px]">
              <Select.Root value={selectedClinicId} onValueChange={setSelectedClinicId}>
                <Select.Trigger placeholder="Select clinic" />
                <Select.Content>
                  {clinics.map((clinic) => (
                    <Select.Item key={clinic._id} value={clinic._id}>
                      {clinic.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { label: "Invoices", value: String(invoices.length) },
            { label: "Billed", value: formatMoney(revenueSummary.total) },
            { label: "Collected", value: formatMoney(revenueSummary.paid) },
          ].map((item) => (
            <Card key={item.label} className="border border-slate-200 bg-white/80 p-6">
              <Text size="2" className="text-slate-500">
                {item.label}
              </Text>
              <Heading size="6" className="font-display text-slate-900">
                {item.value}
              </Heading>
            </Card>
          ))}
        </section>

        {error ? (
          <Card className="mt-6 border border-red-200 bg-red-50 p-6">
            <Text size="2" className="text-red-600">
              {error}
            </Text>
          </Card>
        ) : null}

        <section className="mt-10 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border border-slate-200 bg-white/90 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Heading size="5" className="font-display">
                  Service catalog
                </Heading>
                <Text size="3" className="mt-2 text-slate-600">
                  Set clinic pricing for consultation and procedures.
                </Text>
              </div>
              <Badge color={canManageCatalog ? "green" : "gray"} variant="soft">
                {canManageCatalog ? "Editable" : "Read only"}
              </Badge>
            </div>

            {canManageCatalog ? (
              <form className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4" onSubmit={submitService}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-600">
                    Service name
                    <TextField.Root
                      className="mt-2"
                      value={serviceForm.name}
                      onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    Code
                    <TextField.Root
                      className="mt-2"
                      value={serviceForm.code}
                      onChange={(event) => setServiceForm((current) => ({ ...current, code: event.target.value }))}
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    Price
                    <TextField.Root
                      className="mt-2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceForm.price}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          price: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    Status
                    <Select.Root
                      value={serviceForm.isActive ? "active" : "inactive"}
                      onValueChange={(value) =>
                        setServiceForm((current) => ({ ...current, isActive: value === "active" }))
                      }
                    >
                      <Select.Trigger className="mt-2" />
                      <Select.Content>
                        <Select.Item value="active">Active</Select.Item>
                        <Select.Item value="inactive">Inactive</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </label>
                  <label className="block text-sm text-slate-600 md:col-span-2">
                    Description
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                      value={serviceForm.description}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  {editingService ? (
                    <Button type="button" variant="soft" onClick={resetServiceForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                  <Button type="submit" disabled={savingService || !selectedClinicId}>
                    {savingService ? "Saving..." : editingService ? "Update service" : "Add service"}
                  </Button>
                </div>
              </form>
            ) : null}

            <div className="app-scrollbar mt-6 max-h-[18rem] space-y-3 overflow-y-auto pr-2">
              {loading ? (
                <Text size="2" className="text-slate-500">
                  Loading services...
                </Text>
              ) : null}
              {!loading && services.length === 0 ? (
                <Text size="2" className="text-slate-500">
                  No services configured yet.
                </Text>
              ) : null}
              {services.map((service) => (
                <div
                  key={service._id}
                  className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Text size="2" className="font-semibold text-slate-900">
                        {service.name}
                      </Text>
                      <Text size="1" className="text-slate-500">
                        {service.code || "No code"} - {formatMoney(service.price)}
                      </Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={service.isActive ? "green" : "gray"} variant="soft">
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {canManageCatalog ? (
                        <>
                          <Button size="1" variant="soft" onClick={() => openEditService(service)}>
                            Edit
                          </Button>
                          <Button size="1" variant="soft" color="red" onClick={() => removeService(service._id)}>
                            Archive
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {service.description ? (
                    <Text size="1" className="mt-2 text-slate-500">
                      {service.description}
                    </Text>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white/90 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Heading size="5" className="font-display">
                  Invoices
                </Heading>
                <Text size="3" className="mt-2 text-slate-600">
                  Review receipts and record payments per appointment.
                </Text>
              </div>
              <div className="min-w-[180px]">
                <Select.Root value={paymentStatusFilter} onValueChange={(value) => setPaymentStatusFilter(value as typeof paymentStatusFilter)}>
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="all">All payments</Select.Item>
                    <Select.Item value="unpaid">Unpaid</Select.Item>
                    <Select.Item value="partial">Partial</Select.Item>
                    <Select.Item value="paid">Paid</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>

            <div className="app-scrollbar mt-6 max-h-[18rem] space-y-3 overflow-y-auto pr-2">
              {loading ? (
                <Text size="2" className="text-slate-500">
                  Loading invoices...
                </Text>
              ) : null}
              {!loading && invoices.length === 0 ? (
                <Text size="2" className="text-slate-500">
                  No invoices for this clinic yet.
                </Text>
              ) : null}
              {invoices.map((invoice) => (
                <div key={invoice._id} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Text size="2" className="font-semibold text-slate-900">
                        {invoice.patientName}
                      </Text>
                      <Text size="1" className="text-slate-500">
                        {invoice.receiptNumber} - {new Date(invoice.issuedAt).toLocaleDateString()}
                      </Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
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
                      <Button asChild size="1" variant="soft">
                        <Link to={`/appointments/${invoice.appointmentId}`}>Visit</Link>
                      </Button>
                      <Button asChild size="1" variant="soft">
                        <Link to={`/billing/receipts/${invoice._id}`}>Receipt</Link>
                      </Button>
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => setEditingInvoice(invoice)}
                      >
                        Edit invoice
                      </Button>
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => {
                          setPaymentInvoice(invoice);
                          setPaymentAmount(String(invoice.paidAmount));
                          setPaymentNotes(invoice.notes ?? "");
                        }}
                      >
                        Record payment
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                    <div>Total: {formatMoney(invoice.total)}</div>
                    <div>Paid: {formatMoney(invoice.paidAmount)}</div>
                    <div>Balance: {formatMoney(Math.max(invoice.total - invoice.paidAmount, 0))}</div>
                  </div>
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      {invoice.items.map((item) => (
                        <div key={item.lineId} className="flex justify-between gap-3">
                          <span>
                            {item.displayName} x {item.quantity}
                            {item.type === "dispensed_medicine"
                              ? ` (${item.dispenseStatus === "dispensed" ? "dispensed" : "pending dispense"})`
                              : ""}
                          </span>
                          <span>{formatMoney(item.lineTotal)}</span>
                        </div>
                      ))}
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

export default Billing;
