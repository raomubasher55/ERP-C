import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Heading, Select, Text, TextField } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type {
  Clinic,
  InventoryItem,
  InventoryItemCreatePayload,
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
  SupplierCreatePayload,
} from "../types/api";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

type AlertView = "lowStock" | "expiring" | "purchaseOrders";

const toIsoFromLocalInput = (value?: string) => {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`).toISOString();
  }
  return new Date(value).toISOString();
};

const Inventory = () => {
  const { token, user } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [alerts, setAlerts] = useState<{
    lowStockItems: InventoryItem[];
    expiringItems: InventoryItem[];
    openPurchaseOrders: PurchaseOrder[];
  }>({ lowStockItems: [], expiringItems: [], openPurchaseOrders: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierCreatePayload>({
    clinicId: "",
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    isActive: true,
  });
  const [itemForm, setItemForm] = useState<InventoryItemCreatePayload>({
    clinicId: "",
    supplierId: "",
    name: "",
    sku: "",
    category: "",
    unit: "box",
    currentStock: 0,
    minStockLevel: 0,
    purchasePrice: 0,
    salePrice: 0,
    expiryDate: "",
    isActive: true,
  });
  const [purchaseOrderSupplierId, setPurchaseOrderSupplierId] = useState("");
  const [purchaseOrderStatus, setPurchaseOrderStatus] = useState<PurchaseOrderStatus>("pending");
  const [purchaseOrderNotes, setPurchaseOrderNotes] = useState("");
  const [orderLines, setOrderLines] = useState<
    Array<{ inventoryItemId: string; quantity: number; costPrice: number; expiryDate: string }>
  >([]);
  const [alertView, setAlertView] = useState<AlertView>("lowStock");
  const [draftLine, setDraftLine] = useState({
    inventoryItemId: "",
    quantity: 1,
    costPrice: 0,
    expiryDate: "",
  });

  const canManage =
    user?.role === "admin" ||
    user?.role === "clinic_owner" ||
    user?.role === "clinic" ||
    user?.role === "receptionist";

  const loadClinics = useCallback(async () => {
    if (!token) return;
    const res = await api.get<{ clinics: Clinic[] }>("/api/clinics", token);
    setClinics(res.clinics);
    if (!selectedClinicId && res.clinics.length > 0) {
      setSelectedClinicId(res.clinics[0]._id);
    }
  }, [selectedClinicId, token]);

  const loadInventory = useCallback(async () => {
    if (!token || !selectedClinicId) return;
    setLoading(true);
    setError(null);
    try {
      const query = `?clinicId=${selectedClinicId}`;
      const [suppliersRes, itemsRes, ordersRes, alertsRes] = await Promise.all([
        api.get<{ suppliers: Supplier[] }>(`/api/inventory/suppliers${query}&limit=100`, token),
        api.get<{ items: InventoryItem[] }>(`/api/inventory/items${query}&limit=100`, token),
        api.get<{ purchaseOrders: PurchaseOrder[] }>(`/api/inventory/purchase-orders${query}&limit=100`, token),
        api.get<{ lowStockItems: InventoryItem[]; expiringItems: InventoryItem[]; openPurchaseOrders: PurchaseOrder[] }>(`/api/inventory/alerts${query}`, token),
      ]);

      setSuppliers(suppliersRes.suppliers);
      setItems(itemsRes.items);
      setPurchaseOrders(ordersRes.purchaseOrders);
      setAlerts(alertsRes);
      setSupplierForm((current) => ({ ...current, clinicId: selectedClinicId }));
      setItemForm((current) => ({ ...current, clinicId: selectedClinicId }));
    } catch (err) {
      const message = (err as { message?: string }).message || "Unable to load inventory data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedClinicId, token]);

  useEffect(() => {
    if (token) {
      loadClinics().catch(() => setError("Unable to load clinics"));
    }
  }, [loadClinics, token]);

  useEffect(() => {
    if (selectedClinicId) {
      loadInventory();
    }
  }, [loadInventory, selectedClinicId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const nextView =
      alerts.lowStockItems.length > 0
        ? "lowStock"
        : alerts.expiringItems.length > 0
          ? "expiring"
          : alerts.openPurchaseOrders.length > 0
            ? "purchaseOrders"
            : "lowStock";

    const currentHasItems =
      (alertView === "lowStock" && alerts.lowStockItems.length > 0) ||
      (alertView === "expiring" && alerts.expiringItems.length > 0) ||
      (alertView === "purchaseOrders" && alerts.openPurchaseOrders.length > 0);

    if (!currentHasItems) {
      setAlertView(nextView);
    }
  }, [alertView, alerts.expiringItems.length, alerts.lowStockItems.length, alerts.openPurchaseOrders.length]);

  const resetSupplierForm = () => {
    setEditingSupplier(null);
    setSupplierForm({
      clinicId: selectedClinicId,
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      isActive: true,
    });
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemForm({
      clinicId: selectedClinicId,
      supplierId: "",
      name: "",
      sku: "",
      category: "",
      unit: "box",
      currentStock: 0,
      minStockLevel: 0,
      purchasePrice: 0,
      salePrice: 0,
      expiryDate: "",
      isActive: true,
    });
  };

  const submitSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedClinicId) return;
    setSaving(true);
    try {
      const payload = {
        clinicId: selectedClinicId,
        name: supplierForm.name,
        contactPerson: supplierForm.contactPerson || undefined,
        phone: supplierForm.phone || undefined,
        email: supplierForm.email || undefined,
        address: supplierForm.address || undefined,
        isActive: supplierForm.isActive,
      };
      if (editingSupplier) {
        await api.patch(`/api/inventory/suppliers/${editingSupplier._id}`, payload, token);
        setToast({ message: "Supplier updated", type: "success" });
      } else {
        await api.post("/api/inventory/suppliers", payload, token);
        setToast({ message: "Supplier created", type: "success" });
      }
      resetSupplierForm();
      await loadInventory();
    } catch (err) {
      const message = (err as { message?: string }).message || "Unable to save supplier";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const submitItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedClinicId) return;
    setSaving(true);
    try {
      const payload = {
        clinicId: selectedClinicId,
        supplierId: itemForm.supplierId || undefined,
        name: itemForm.name,
        sku: itemForm.sku || undefined,
        category: itemForm.category || undefined,
        unit: itemForm.unit,
        currentStock: Number(itemForm.currentStock ?? 0),
        minStockLevel: Number(itemForm.minStockLevel ?? 0),
        purchasePrice: Number(itemForm.purchasePrice ?? 0),
        salePrice: itemForm.salePrice ? Number(itemForm.salePrice) : undefined,
        expiryDate: toIsoFromLocalInput(itemForm.expiryDate),
        isActive: itemForm.isActive,
      };
      if (editingItem) {
        await api.patch(`/api/inventory/items/${editingItem._id}`, payload, token);
        setToast({ message: "Stock item updated", type: "success" });
      } else {
        await api.post("/api/inventory/items", payload, token);
        setToast({ message: "Stock item created", type: "success" });
      }
      resetItemForm();
      await loadInventory();
    } catch (err) {
      const message = (err as { message?: string }).message || "Unable to save stock item";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const archiveSupplier = async (supplierId: string) => {
    if (!token) return;
    try {
      await api.delete(`/api/inventory/suppliers/${supplierId}`, token);
      setToast({ message: "Supplier archived", type: "success" });
      await loadInventory();
    } catch (err) {
      const message = (err as { message?: string }).message || "Unable to archive supplier";
      setToast({ message, type: "error" });
    }
  };

  const archiveItem = async (itemId: string) => {
    if (!token) return;
    try {
      await api.delete(`/api/inventory/items/${itemId}`, token);
      setToast({ message: "Stock item archived", type: "success" });
      await loadInventory();
    } catch (err) {
      const message = (err as { message?: string }).message || "Unable to archive stock item";
      setToast({ message, type: "error" });
    }
  };

  const addOrderLine = () => {
    if (!draftLine.inventoryItemId || draftLine.quantity <= 0 || draftLine.costPrice < 0) return;
    setOrderLines((current) => [...current, draftLine]);
    setDraftLine({ inventoryItemId: "", quantity: 1, costPrice: 0, expiryDate: "" });
  };

  const submitPurchaseOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedClinicId || !purchaseOrderSupplierId || orderLines.length === 0) return;
    setSaving(true);
    try {
      await api.post(
        "/api/inventory/purchase-orders",
        {
          clinicId: selectedClinicId,
          supplierId: purchaseOrderSupplierId,
          status: purchaseOrderStatus,
          notes: purchaseOrderNotes || undefined,
          items: orderLines.map((line) => ({
            inventoryItemId: line.inventoryItemId,
            quantity: Number(line.quantity),
            costPrice: Number(line.costPrice),
            expiryDate: toIsoFromLocalInput(line.expiryDate),
          })),
        },
        token
      );
      setToast({ message: "Purchase order saved", type: "success" });
      setPurchaseOrderSupplierId("");
      setPurchaseOrderStatus("pending");
      setPurchaseOrderNotes("");
      setOrderLines([]);
      setDraftLine({ inventoryItemId: "", quantity: 1, costPrice: 0, expiryDate: "" });
      await loadInventory();
    } catch (err) {
      const message = (err as { message?: string }).message || "Unable to save purchase order";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updatePurchaseOrderStatus = async (
    purchaseOrder: PurchaseOrder,
    status: Extract<PurchaseOrderStatus, "received" | "cancelled">
  ) => {
    if (!token) return;
    try {
      await api.patch(`/api/inventory/purchase-orders/${purchaseOrder._id}`, { status }, token);
      setToast({ message: `Purchase order marked ${status}`, type: "success" });
      await loadInventory();
    } catch (err) {
      const message = (err as { message?: string }).message || "Unable to update purchase order";
      setToast({ message, type: "error" });
    }
  };

  const supplierNameById = useMemo(
    () => Object.fromEntries(suppliers.map((supplier) => [supplier._id, supplier.name])),
    [suppliers]
  );

  const inventorySummary = useMemo(() => {
    const stockValue = items.reduce((sum, item) => sum + item.currentStock * item.purchasePrice, 0);
    return {
      items: items.length,
      suppliers: suppliers.length,
      lowStock: alerts.lowStockItems.length,
      stockValue,
    };
  }, [alerts.lowStockItems.length, items, suppliers.length]);

  const alertCards = [
    {
      key: "lowStock" as const,
      title: "Low stock",
      count: alerts.lowStockItems.length,
      helper: alerts.lowStockItems.length > 0 ? "Needs reorder" : "All clear",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      activeTone: "ring-2 ring-amber-300",
    },
    {
      key: "expiring" as const,
      title: "Expiring soon",
      count: alerts.expiringItems.length,
      helper: alerts.expiringItems.length > 0 ? "Within review window" : "Nothing close",
      tone: "border-rose-200 bg-rose-50 text-rose-800",
      activeTone: "ring-2 ring-rose-300",
    },
    {
      key: "purchaseOrders" as const,
      title: "Open POs",
      count: alerts.openPurchaseOrders.length,
      helper: alerts.openPurchaseOrders.length > 0 ? "Awaiting receipt" : "No pending orders",
      tone: "border-sky-200 bg-sky-50 text-sky-800",
      activeTone: "ring-2 ring-sky-300",
    },
  ];

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

      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Inventory
            </Text>
            <Heading size="8" className="font-display">
              Pharmacy stock and purchase orders
            </Heading>
            <Text size="3" className="text-slate-500">
              Track suppliers, medicines, low-stock alerts, and goods received.
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="soft">
              <Link to="/billing">Billing</Link>
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

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            { label: "Stock items", value: String(inventorySummary.items) },
            { label: "Suppliers", value: String(inventorySummary.suppliers) },
            { label: "Low-stock alerts", value: String(inventorySummary.lowStock) },
            { label: "Stock value", value: formatMoney(inventorySummary.stockValue) },
          ].map((item) => (
            <Card key={item.label} className="border border-slate-200 bg-white/80 p-6">
              <Text size="2" className="text-slate-500">{item.label}</Text>
              <Heading size="6" className="font-display text-slate-900">{item.value}</Heading>
            </Card>
          ))}
        </section>

        {error ? (
          <Card className="mt-6 border border-red-200 bg-red-50 p-6">
            <Text size="2" className="text-red-600">{error}</Text>
          </Card>
        ) : null}

        <section className="mt-10 grid items-start gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border border-slate-200 bg-white/90 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Heading size="5" className="font-display">Alerts</Heading>
                <Text size="3" className="mt-2 text-slate-600">Monitor low stock, expiry risk, and open procurement.</Text>
              </div>
                <Badge color={canManage ? "green" : "gray"} variant="soft">
                  {canManage ? "Manage inventory" : "Read only"}
                </Badge>
              </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {alertCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setAlertView(card.key)}
                  className={`rounded-2xl border p-4 text-left transition ${card.tone} ${
                    alertView === card.key ? card.activeTone : ""
                  }`}
                >
                  <Text size="1" className="uppercase tracking-[0.18em] opacity-80">
                    {card.title}
                  </Text>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <Heading size="7" className="font-display">
                      {card.count}
                    </Heading>
                    <Badge variant="soft" color={card.count > 0 ? "gray" : "green"}>
                      {card.count > 0 ? "Attention" : "Clear"}
                    </Badge>
                  </div>
                  <Text size="2" className="mt-2 block opacity-80">
                    {card.helper}
                  </Text>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Heading size="4" className="font-display">
                    {alertView === "lowStock"
                      ? "Low-stock items"
                      : alertView === "expiring"
                        ? "Expiring items"
                        : "Pending purchase orders"}
                  </Heading>
                  <Text size="2" className="mt-1 text-slate-500">
                    {alertView === "lowStock"
                      ? "Review items that have reached their minimum threshold."
                      : alertView === "expiring"
                        ? "Check medicine batches that need action soon."
                        : "Track procurement that still needs receiving."}
                  </Text>
                </div>
                <Badge variant="soft" color="gray">
                  {alertView === "lowStock"
                    ? `${alerts.lowStockItems.length} items`
                    : alertView === "expiring"
                      ? `${alerts.expiringItems.length} items`
                      : `${alerts.openPurchaseOrders.length} orders`}
                </Badge>
              </div>

              <div className="app-scrollbar mt-4 max-h-[14rem] space-y-3 overflow-y-auto pr-2">
                {alertView === "lowStock" && alerts.lowStockItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-emerald-200 bg-white/80 px-4 py-4 text-sm text-slate-500">
                    All tracked items are above their minimum stock level.
                  </div>
                ) : null}

                {alertView === "lowStock" &&
                  alerts.lowStockItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3"
                    >
                      <div>
                        <Text size="2" className="font-semibold text-slate-900">
                          {item.name}
                        </Text>
                        <Text size="1" className="text-slate-500">
                          {item.category || "General"} · {item.currentStock} {item.unit} left
                        </Text>
                      </div>
                      <div className="text-right">
                        <Badge variant="soft" color="amber">
                          Min {item.minStockLevel} {item.unit}
                        </Badge>
                        <Text size="1" className="mt-2 block text-slate-500">
                          Reorder suggested
                        </Text>
                      </div>
                    </div>
                  ))}

                {alertView === "expiring" && alerts.expiringItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-emerald-200 bg-white/80 px-4 py-4 text-sm text-slate-500">
                    No active inventory items are close to expiry.
                  </div>
                ) : null}

                {alertView === "expiring" &&
                  alerts.expiringItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white px-4 py-3"
                    >
                      <div>
                        <Text size="2" className="font-semibold text-slate-900">
                          {item.name}
                        </Text>
                        <Text size="1" className="text-slate-500">
                          {item.currentStock} {item.unit} in stock
                        </Text>
                      </div>
                      <div className="text-right">
                        <Badge variant="soft" color="red">
                          Expires {formatDate(item.expiryDate)}
                        </Badge>
                        <Text size="1" className="mt-2 block text-slate-500">
                          Review batch usage
                        </Text>
                      </div>
                    </div>
                  ))}

                {alertView === "purchaseOrders" && alerts.openPurchaseOrders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-emerald-200 bg-white/80 px-4 py-4 text-sm text-slate-500">
                    No purchase orders are currently waiting to be received.
                  </div>
                ) : null}

                {alertView === "purchaseOrders" &&
                  alerts.openPurchaseOrders.map((purchaseOrder) => (
                    <div
                      key={purchaseOrder._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3"
                    >
                      <div>
                        <Text size="2" className="font-semibold text-slate-900">
                          {purchaseOrder.orderNumber}
                        </Text>
                        <Text size="1" className="text-slate-500">
                          {supplierNameById[purchaseOrder.supplierId] || "Supplier"} · {purchaseOrder.items.length} items
                        </Text>
                      </div>
                      <div className="text-right">
                        <Badge variant="soft" color="blue">
                          {formatMoney(purchaseOrder.totalAmount)}
                        </Badge>
                        <Text size="1" className="mt-2 block text-slate-500">
                          Awaiting receipt
                        </Text>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white/90 p-6">
            <div>
              <Heading size="5" className="font-display">Suppliers</Heading>
              <Text size="3" className="mt-2 text-slate-600">Keep vendor contacts ready for purchase orders.</Text>
            </div>
            {canManage ? (
              <form className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4" onSubmit={submitSupplier}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-600">Name
                    <TextField.Root className="mt-2" value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} required />
                  </label>
                  <label className="block text-sm text-slate-600">Contact person
                    <TextField.Root className="mt-2" value={supplierForm.contactPerson} onChange={(event) => setSupplierForm((current) => ({ ...current, contactPerson: event.target.value }))} />
                  </label>
                  <label className="block text-sm text-slate-600">Phone
                    <TextField.Root className="mt-2" value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} />
                  </label>
                  <label className="block text-sm text-slate-600">Email
                    <TextField.Root className="mt-2" value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} />
                  </label>
                  <label className="block text-sm text-slate-600 md:col-span-2">Address
                    <textarea className="mt-2 min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400" value={supplierForm.address} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} />
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  {editingSupplier ? <Button type="button" variant="soft" onClick={resetSupplierForm}>Cancel edit</Button> : null}
                  <Button type="submit" disabled={saving || !selectedClinicId}>{editingSupplier ? "Update supplier" : "Add supplier"}</Button>
                </div>
              </form>
            ) : null}
            <div className="app-scrollbar mt-6 max-h-[18rem] space-y-3 overflow-y-auto pr-2">
              {loading ? <Text size="2" className="text-slate-500">Loading suppliers...</Text> : null}
              {!loading && suppliers.length === 0 ? <Text size="2" className="text-slate-500">No suppliers added yet.</Text> : null}
              {suppliers.map((supplier) => (
                <div key={supplier._id} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Text size="2" className="font-semibold text-slate-900">{supplier.name}</Text>
                      <Text size="1" className="text-slate-500">{supplier.contactPerson || "No contact person"} - {supplier.phone || "No phone"}</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={supplier.isActive ? "green" : "gray"} variant="soft">{supplier.isActive ? "Active" : "Inactive"}</Badge>
                      {canManage ? (
                        <>
                          <Button size="1" variant="soft" onClick={() => {
                            setEditingSupplier(supplier);
                            setSupplierForm({
                              clinicId: supplier.clinicId,
                              name: supplier.name,
                              contactPerson: supplier.contactPerson || "",
                              phone: supplier.phone || "",
                              email: supplier.email || "",
                              address: supplier.address || "",
                              isActive: supplier.isActive,
                            });
                          }}>Edit</Button>
                          <Button size="1" variant="soft" color="red" onClick={() => archiveSupplier(supplier._id)}>Archive</Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-10 grid items-start gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border border-slate-200 bg-white/90 p-6">
            <div>
              <Heading size="5" className="font-display">Stock items</Heading>
              <Text size="3" className="mt-2 text-slate-600">Store medicines, pricing, supplier links, and expiry dates.</Text>
            </div>
            {canManage ? (
              <form className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4" onSubmit={submitItem}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-600">Name
                    <TextField.Root className="mt-2" value={itemForm.name} onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))} required />
                  </label>
                  <label className="block text-sm text-slate-600">Supplier
                    <Select.Root value={itemForm.supplierId || "none"} onValueChange={(value) => setItemForm((current) => ({ ...current, supplierId: value === "none" ? "" : value }))}>
                      <Select.Trigger className="mt-2" />
                      <Select.Content>
                        <Select.Item value="none">No supplier</Select.Item>
                        {suppliers.map((supplier) => <Select.Item key={supplier._id} value={supplier._id}>{supplier.name}</Select.Item>)}
                      </Select.Content>
                    </Select.Root>
                  </label>
                  <label className="block text-sm text-slate-600">SKU
                    <TextField.Root className="mt-2" value={itemForm.sku} onChange={(event) => setItemForm((current) => ({ ...current, sku: event.target.value }))} />
                  </label>
                  <label className="block text-sm text-slate-600">Category
                    <TextField.Root className="mt-2" value={itemForm.category} onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))} />
                  </label>
                  <label className="block text-sm text-slate-600">Unit
                    <TextField.Root className="mt-2" value={itemForm.unit} onChange={(event) => setItemForm((current) => ({ ...current, unit: event.target.value }))} required />
                  </label>
                  <label className="block text-sm text-slate-600">Current stock
                    <TextField.Root className="mt-2" type="number" min="0" value={itemForm.currentStock} onChange={(event) => setItemForm((current) => ({ ...current, currentStock: Number(event.target.value) }))} required />
                  </label>
                  <label className="block text-sm text-slate-600">Min stock level
                    <TextField.Root className="mt-2" type="number" min="0" value={itemForm.minStockLevel} onChange={(event) => setItemForm((current) => ({ ...current, minStockLevel: Number(event.target.value) }))} required />
                  </label>
                  <label className="block text-sm text-slate-600">Purchase price
                    <TextField.Root className="mt-2" type="number" min="0" step="0.01" value={itemForm.purchasePrice} onChange={(event) => setItemForm((current) => ({ ...current, purchasePrice: Number(event.target.value) }))} required />
                  </label>
                  <label className="block text-sm text-slate-600">Sale price
                    <TextField.Root className="mt-2" type="number" min="0" step="0.01" value={itemForm.salePrice} onChange={(event) => setItemForm((current) => ({ ...current, salePrice: Number(event.target.value) }))} />
                  </label>
                  <label className="block text-sm text-slate-600">Expiry date
                    <input
                      className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
                      type="date"
                      value={itemForm.expiryDate}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, expiryDate: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  {editingItem ? <Button type="button" variant="soft" onClick={resetItemForm}>Cancel edit</Button> : null}
                  <Button type="submit" disabled={saving || !selectedClinicId}>{editingItem ? "Update item" : "Add item"}</Button>
                </div>
              </form>
            ) : null}
            <div className="app-scrollbar mt-6 max-h-[22rem] space-y-3 overflow-y-auto pr-2">
              {loading ? <Text size="2" className="text-slate-500">Loading items...</Text> : null}
              {!loading && items.length === 0 ? <Text size="2" className="text-slate-500">No stock items added yet.</Text> : null}
              {items.map((item) => {
                const isLow = item.currentStock <= item.minStockLevel;
                return (
                  <div key={item._id} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Text size="2" className="font-semibold text-slate-900">{item.name}</Text>
                        <Text size="1" className="text-slate-500">{item.sku || "No SKU"} - {item.category || "General"} - Supplier: {item.supplierId ? supplierNameById[item.supplierId] || "Linked" : "None"}</Text>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={isLow ? "amber" : "green"} variant="soft">{isLow ? "Low stock" : "Healthy"}</Badge>
                        {canManage ? (
                          <>
                            <Button size="1" variant="soft" onClick={() => {
                              setEditingItem(item);
                              setItemForm({
                                clinicId: item.clinicId,
                                supplierId: item.supplierId || "",
                                name: item.name,
                                sku: item.sku || "",
                                category: item.category || "",
                                unit: item.unit,
                                currentStock: item.currentStock,
                                minStockLevel: item.minStockLevel,
                                purchasePrice: item.purchasePrice,
                                salePrice: item.salePrice || 0,
                                expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "",
                                isActive: item.isActive,
                              });
                            }}>Edit</Button>
                            <Button size="1" variant="soft" color="red" onClick={() => archiveItem(item._id)}>Archive</Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                      <div>Stock: {item.currentStock} {item.unit}</div>
                      <div>Min: {item.minStockLevel} {item.unit}</div>
                      <div>Cost: {formatMoney(item.purchasePrice)}</div>
                      <div>Expiry: {formatDate(item.expiryDate)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white/90 p-6">
            <div>
              <Heading size="5" className="font-display">Purchase orders</Heading>
              <Text size="3" className="mt-2 text-slate-600">Create orders and mark them received to add stock automatically.</Text>
            </div>
            {canManage ? (
              <form className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4" onSubmit={submitPurchaseOrder}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-600">Supplier
                    <Select.Root value={purchaseOrderSupplierId || "none"} onValueChange={(value) => setPurchaseOrderSupplierId(value === "none" ? "" : value)}>
                      <Select.Trigger className="mt-2" />
                      <Select.Content>
                        <Select.Item value="none">Select supplier</Select.Item>
                        {suppliers.map((supplier) => <Select.Item key={supplier._id} value={supplier._id}>{supplier.name}</Select.Item>)}
                      </Select.Content>
                    </Select.Root>
                  </label>
                  <label className="block text-sm text-slate-600">Status
                    <Select.Root value={purchaseOrderStatus} onValueChange={(value) => setPurchaseOrderStatus(value as PurchaseOrderStatus)}>
                      <Select.Trigger className="mt-2" />
                      <Select.Content>
                        <Select.Item value="pending">Pending</Select.Item>
                        <Select.Item value="received">Received now</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </label>
                  <label className="block text-sm text-slate-600 md:col-span-2">Notes
                    <textarea className="mt-2 min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400" value={purchaseOrderNotes} onChange={(event) => setPurchaseOrderNotes(event.target.value)} />
                  </label>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
                  <Text size="2" className="font-semibold text-slate-900">Order lines</Text>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Select.Root value={draftLine.inventoryItemId || "none"} onValueChange={(value) => setDraftLine((current) => ({ ...current, inventoryItemId: value === "none" ? "" : value }))}>
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="none">Select item</Select.Item>
                        {items.map((item) => <Select.Item key={item._id} value={item._id}>{item.name}</Select.Item>)}
                      </Select.Content>
                    </Select.Root>
                    <TextField.Root type="number" min="1" value={draftLine.quantity} onChange={(event) => setDraftLine((current) => ({ ...current, quantity: Number(event.target.value) }))} placeholder="Quantity" />
                    <TextField.Root type="number" min="0" step="0.01" value={draftLine.costPrice} onChange={(event) => setDraftLine((current) => ({ ...current, costPrice: Number(event.target.value) }))} placeholder="Cost price" />
                    <input
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
                      type="date"
                      value={draftLine.expiryDate}
                      onChange={(event) =>
                        setDraftLine((current) => ({ ...current, expiryDate: event.target.value }))
                      }
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button type="button" variant="soft" onClick={addOrderLine}>Add line</Button>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    {orderLines.length === 0 ? <div>No lines added yet.</div> : null}
                    {orderLines.map((line, index) => {
                      const item = items.find((entry) => entry._id === line.inventoryItemId);
                      return (
                        <div key={`${line.inventoryItemId}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                          <span>{item?.name || "Unknown item"} x {line.quantity}</span>
                          <span>{formatMoney(line.quantity * line.costPrice)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="submit" disabled={saving || !selectedClinicId || !purchaseOrderSupplierId || orderLines.length === 0}>Save purchase order</Button>
                </div>
              </form>
            ) : null}
            <div className="app-scrollbar mt-6 max-h-[18rem] space-y-3 overflow-y-auto pr-2">
              {loading ? <Text size="2" className="text-slate-500">Loading purchase orders...</Text> : null}
              {!loading && purchaseOrders.length === 0 ? <Text size="2" className="text-slate-500">No purchase orders yet.</Text> : null}
              {purchaseOrders.map((purchaseOrder) => (
                <div key={purchaseOrder._id} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Text size="2" className="font-semibold text-slate-900">{purchaseOrder.orderNumber}</Text>
                      <Text size="1" className="text-slate-500">{supplierNameById[purchaseOrder.supplierId] || "Supplier"} - Ordered {formatDate(purchaseOrder.orderedAt)}</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={purchaseOrder.status === "received" ? "green" : purchaseOrder.status === "cancelled" ? "red" : "amber"} variant="soft">{purchaseOrder.status}</Badge>
                      {canManage && purchaseOrder.status === "pending" ? (
                        <>
                          <Button size="1" variant="soft" onClick={() => updatePurchaseOrderStatus(purchaseOrder, "received")}>Receive</Button>
                          <Button size="1" variant="soft" color="red" onClick={() => updatePurchaseOrderStatus(purchaseOrder, "cancelled")}>Cancel</Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                    <div>Total: {formatMoney(purchaseOrder.totalAmount)}</div>
                    <div>Items: {purchaseOrder.items.length}</div>
                    <div>Received: {formatDate(purchaseOrder.receivedAt)}</div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    {purchaseOrder.items.map((line, index) => (
                      <div key={`${purchaseOrder._id}-${index}`} className="flex justify-between gap-3">
                        <span>{line.itemName} x {line.quantity}</span>
                        <span>{formatMoney(line.lineTotal)}</span>
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

export default Inventory;
