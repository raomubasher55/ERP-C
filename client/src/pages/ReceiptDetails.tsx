import { Badge, Button, Card, Heading, Text } from "@radix-ui/themes";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { Appointment, Clinic, Invoice } from "../types/api";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "-";

const ReceiptDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReceipt = async () => {
      if (!token || !id) return;
      setLoading(true);
      setError(null);
      try {
        const invoiceRes = await api.get<{ invoice: Invoice }>(`/api/billing/invoices/${id}`, token);
        setInvoice(invoiceRes.invoice);
        try {
          const appointmentRes = await api.get<{ appointment: Appointment }>(
            `/api/appointments/${invoiceRes.invoice.appointmentId}`,
            token
          );
          setAppointment(appointmentRes.appointment);
        } catch {
          setAppointment(null);
        }

        try {
          if (user?.role === "patient") {
            const clinicsRes = await api.get<{ clinics: Clinic[] }>("/api/clinics/public");
            setClinic(
              clinicsRes.clinics.find((entry) => entry._id === invoiceRes.invoice.clinicId) ?? null
            );
          } else {
            const clinicRes = await api.get<{ clinic: Clinic }>(
              `/api/clinics/${invoiceRes.invoice.clinicId}`,
              token
            );
            setClinic(clinicRes.clinic);
          }
        } catch {
          setClinic(null);
        }
      } catch (err) {
        const message = (err as { message?: string })?.message || "Unable to load receipt";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadReceipt();
  }, [id, token, user?.role]);

  const balance = useMemo(
    () => (invoice ? Math.max(invoice.total - invoice.paidAmount, 0) : 0),
    [invoice]
  );

  const printReceipt = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="receipt-page min-h-screen bg-app-gradient text-slate-950">
      <TopNav />
      <div className="receipt-shell mx-auto w-full max-w-4xl px-6 py-10">
        <div className="receipt-toolbar mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Receipt
            </Text>
            <Heading size="8" className="font-display">
              Printable visit receipt
            </Heading>
            <Text size="3" className="text-slate-500">
              Use the browser print dialog to print or download this receipt as PDF.
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="soft" onClick={() => navigate(-1)}>
              Back
            </Button>
            {invoice ? (
              <Button asChild variant="soft">
                <Link to={`/appointments/${invoice.appointmentId}`}>Appointment</Link>
              </Button>
            ) : null}
            <Button onClick={printReceipt}>Download PDF / Print</Button>
          </div>
        </div>

        {loading ? (
          <Card className="border border-slate-200 bg-white/90 p-6">
            <Text size="2" className="text-slate-500">
              Loading receipt...
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

        {!loading && !error && invoice ? (
          <Card className="receipt-card border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,118,110,0.12)]">
            <div className="receipt-brand-panel overflow-hidden rounded-[32px] border border-emerald-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_42%),linear-gradient(135deg,_#f0fdf4_0%,_#ffffff_55%,_#ecfeff_100%)] p-6">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="receipt-mark flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(180deg,#0f766e,#10b981)] text-xl font-semibold tracking-[0.3em] text-white shadow-[0_20px_40px_rgba(16,185,129,0.28)]">
                    EPR
                  </div>
                  <div>
                    <Text size="1" className="uppercase tracking-[0.28em] text-emerald-700">
                      Clinic Receipt
                    </Text>
                    <Heading size="7" className="mt-2 font-display text-slate-950">
                      {clinic?.name ?? "Clinic Receipt"}
                    </Heading>
                    <Text size="2" className="mt-2 text-slate-600">
                      {clinic?.city ?? "Clinic"}
                      {clinic?.phone ? ` - ${clinic.phone}` : ""}
                    </Text>
                    {clinic?.email ? (
                      <Text size="2" className="text-slate-600">
                        {clinic.email}
                      </Text>
                    ) : null}
                  </div>
                </div>
                <div className="receipt-meta-card min-w-[220px] rounded-[24px] border border-white/70 bg-white/80 p-4 text-right shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
                  <Text size="1" className="uppercase tracking-[0.22em] text-slate-400">
                    Receipt Number
                  </Text>
                  <Heading size="5" className="mt-2 font-display">
                    {invoice.receiptNumber}
                  </Heading>
                  <Text size="2" className="mt-2 text-slate-500">
                    Download PDF from the print dialog.
                  </Text>
                  <Badge
                    className="mt-3"
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
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                  Patient
                </Text>
                <Text size="4" className="mt-2 font-semibold text-slate-900">
                  {invoice.patientName}
                </Text>
                <Text size="2" className="mt-1 text-slate-500">
                  {invoice.patientPhone || "Phone not provided"}
                </Text>
              </div>
              <div className="md:text-right">
                <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                  Visit Time
                </Text>
                <Text size="3" className="mt-2 text-slate-900">
                  {formatDate(invoice.scheduledAt)}
                </Text>
                <Text size="2" className="mt-1 text-slate-500">
                  Issued: {formatDate(invoice.issuedAt)}
                </Text>
                {invoice.paidAt ? (
                  <Text size="2" className="text-slate-500">
                    Paid: {formatDate(invoice.paidAt)}
                  </Text>
                ) : null}
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1.2fr_0.4fr_0.6fr_0.6fr] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span>Item</span>
                <span>Qty</span>
                <span>Rate</span>
                <span className="text-right">Total</span>
              </div>
              <div className="divide-y divide-slate-200">
                {invoice.items.map((item) => (
                  <div
                    key={item.lineId}
                    className="grid grid-cols-[1.2fr_0.4fr_0.6fr_0.6fr] px-4 py-4 text-sm text-slate-700"
                  >
                    <span>
                      {item.displayName}
                      {item.type === "dispensed_medicine" ? (
                        <span className="ml-2 text-xs text-slate-500">
                          {item.dispenseStatus === "dispensed" ? "dispensed" : "pending dispense"}
                        </span>
                      ) : null}
                    </span>
                    <span>{item.quantity}</span>
                    <span>{formatMoney(item.unitPrice)}</span>
                    <span className="text-right font-semibold">{formatMoney(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {appointment?.prescriptions?.length ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white/80 p-4">
                <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                  Prescription-only medicines
                </Text>
                <div className="mt-3 space-y-3">
                  {appointment.prescriptions.map((line, index) => (
                    <div
                      key={`prescription-${index}`}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                    >
                      <Text size="2" className="font-semibold text-slate-900">
                        {line.name}
                      </Text>
                      <Text size="1" className="mt-1 text-slate-500">
                        {[line.dosage, line.frequency, line.duration].filter(Boolean).join(" - ") ||
                          "No structured dosing"}
                      </Text>
                      {line.notes ? (
                        <Text size="2" className="mt-2 text-slate-600">
                          {line.notes}
                        </Text>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-8 ml-auto max-w-sm space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatMoney(invoice.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Discount</span>
                <span>{formatMoney(invoice.discount)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatMoney(invoice.total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Paid</span>
                <span>{formatMoney(invoice.paidAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>Balance</span>
                <span>{formatMoney(balance)}</span>
              </div>
            </div>

            {invoice.notes ? (
              <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <Text size="1" className="uppercase tracking-[0.2em] text-emerald-700">
                  Notes
                </Text>
                <Text size="2" className="mt-2 text-slate-700">
                  {invoice.notes}
                </Text>
              </div>
            ) : null}

            <div className="mt-8 border-t border-slate-200 pt-4 text-center">
              <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                Thank you
              </Text>
              <Text size="2" className="mt-2 text-slate-500">
                This receipt is optimized for printing and browser PDF export.
              </Text>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default ReceiptDetails;
