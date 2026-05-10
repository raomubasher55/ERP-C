import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Heading, Select, Text, TextField } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  formatReportDate,
  formatReportMoney,
  formatReportPercent,
  reportPresetOptions,
} from "../lib/reports";
import type { Clinic, ReportsOverview, ReportPreset } from "../types/api";

const SimpleBarChart = ({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{ date: string; value: number }>;
  tone: "emerald" | "amber";
}) => {
  const maxValue = Math.max(...items.map((item) => item.value), 0);
  const barColor = tone === "amber" ? "bg-amber-400" : "bg-emerald-500";

  return (
    <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
      <Heading size="5" className="font-display">
        {title}
      </Heading>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {items.map((item) => (
          <div key={`${title}-${item.date}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex h-28 items-end rounded-xl bg-white px-2 py-3">
              <div
                className={`w-full rounded-t-lg ${barColor} transition-[height]`}
                style={{
                  height:
                    maxValue > 0 ? `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%` : "0%",
                }}
              />
            </div>
            <Text size="1" className="mt-3 block text-slate-500">
              {formatReportDate(item.date)}
            </Text>
            <Text size="2" className="font-semibold text-slate-900">
              {title === "Revenue trend" ? formatReportMoney(item.value) : item.value}
            </Text>
          </div>
        ))}
      </div>
    </Card>
  );
};

const Reports = () => {
  const { token, user } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState("");
  const [preset, setPreset] = useState<ReportPreset>("7d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadClinics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<{ clinics: Clinic[] }>("/api/clinics", token);
      setClinics(res.clinics);
    } catch {
      setClinics([]);
    }
  }, [token]);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (clinicId) {
        params.set("clinicId", clinicId);
      }
      if (dateFrom && dateTo) {
        params.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString());
        params.set("dateTo", new Date(`${dateTo}T23:59:59.999`).toISOString());
      } else {
        params.set("preset", preset);
      }
      const path = params.toString()
        ? `/api/reports/overview?${params.toString()}`
        : "/api/reports/overview";
      const res = await api.get<ReportsOverview>(path, token);
      setOverview(res);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Unable to load reports";
      setError(message);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [clinicId, dateFrom, dateTo, preset, token]);

  useEffect(() => {
    if (token) {
      loadClinics();
    }
  }, [loadClinics, token]);

  useEffect(() => {
    if (token) {
      loadOverview();
    }
  }, [loadOverview, token]);

  const showClinicSelector = clinics.length > 1;
  const showClinicPerformance = useMemo(() => {
    if (!overview) return false;
    return overview.clinicPerformance.length > 1;
  }, [overview]);

  return (
    <div className="min-h-screen bg-app-gradient text-slate-950">
      <TopNav />
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Reports & Analytics
            </Text>
            <Heading size="8" className="font-display">
              {user?.role === "admin" ? "Platform performance" : "Clinic performance"}
            </Heading>
            <Text size="3" className="text-slate-500">
              Track revenue, utilization, cancellations, and clinic output from one place.
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="soft">
              <Link to="/appointments">Appointments</Link>
            </Button>
            <Button asChild variant="soft">
              <Link to="/billing">Billing</Link>
            </Button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 md:grid-cols-5">
          {showClinicSelector ? (
            <label className="grid gap-2 text-sm text-slate-600">
              Clinic
              <Select.Root
                value={clinicId || "all"}
                onValueChange={(value) => setClinicId(value === "all" ? "" : value)}
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
          ) : (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
              {clinics[0]?.name ?? "Scoped analytics"}
            </div>
          )}

          <label className="grid gap-2 text-sm text-slate-600">
            Preset range
            <Select.Root
              value={preset}
              onValueChange={(value) => {
                setPreset(value as ReportPreset);
                setDateFrom("");
                setDateTo("");
              }}
            >
              <Select.Trigger />
              <Select.Content>
                {reportPresetOptions.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </label>

          <label className="grid gap-2 text-sm text-slate-600">
            From
            <TextField.Root
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-600">
            To
            <TextField.Root
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>

          <div className="flex items-end gap-3">
            <Button onClick={loadOverview}>Apply</Button>
            <Button
              variant="soft"
              onClick={() => {
                setClinicId("");
                setPreset("7d");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset
            </Button>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {loading ? (
            <Card className="border border-slate-200 bg-white/70 p-6 md:col-span-4">
              <Text size="2" className="text-slate-500">
                Loading reports...
              </Text>
            </Card>
          ) : null}
          {error ? (
            <Card className="border border-red-200 bg-red-50 p-6 md:col-span-4">
              <Text size="2" className="text-red-600">
                {error}
              </Text>
            </Card>
          ) : null}
          {!loading && !error && overview
            ? [
                { label: "Invoiced revenue", value: formatReportMoney(overview.summary.revenueTotal) },
                { label: "Appointments", value: String(overview.summary.appointmentsTotal) },
                {
                  label: "Utilization",
                  value: formatReportPercent(overview.summary.appointmentUtilizationRate),
                },
                {
                  label: "Cancellation rate",
                  value: formatReportPercent(overview.summary.cancellationRate),
                },
              ].map((item) => (
                <Card
                  key={item.label}
                  className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]"
                >
                  <Text size="2" className="text-slate-500">
                    {item.label}
                  </Text>
                  <Heading size="6" className="font-display text-slate-900">
                    {item.value}
                  </Heading>
                </Card>
              ))
            : null}
        </section>

        {!loading && !error && overview ? (
          <section className="mt-4 grid gap-4 md:grid-cols-2">
            <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
              <Text size="2" className="text-slate-500">
                Medicine revenue
              </Text>
              <Heading size="6" className="font-display text-slate-900">
                {formatReportMoney(overview.medicineSummary.revenueTotal)}
              </Heading>
              <Text size="2" className="mt-2 text-slate-500">
                Dispensed clinic-store medicine value in the selected range.
              </Text>
            </Card>
            <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
              <Text size="2" className="text-slate-500">
                Dispensed units
              </Text>
              <Heading size="6" className="font-display text-slate-900">
                {overview.medicineSummary.dispensedUnitsTotal}
              </Heading>
              <Text size="2" className="mt-2 text-slate-500">
                Total quantity dispensed from clinic inventory.
              </Text>
            </Card>
          </section>
        ) : null}

        {!loading && !error && overview ? (
          <>
            <section className="mt-10 grid gap-4 xl:grid-cols-[1fr_1fr]">
              <SimpleBarChart title="Revenue trend" items={overview.revenueSeries} tone="emerald" />
              <SimpleBarChart
                title="Appointment trend"
                items={overview.appointmentSeries}
                tone="amber"
              />
            </section>

            <section className="mt-10 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <Heading size="5" className="font-display">
                  Status breakdown
                </Heading>
                <div className="mt-6 space-y-3">
                  {[
                    ["Pending", overview.appointmentStatusBreakdown.pending],
                    ["Confirmed", overview.appointmentStatusBreakdown.confirmed],
                    ["Completed", overview.appointmentStatusBreakdown.completed],
                    ["Cancelled", overview.appointmentStatusBreakdown.cancelled],
                    ["No show", overview.appointmentStatusBreakdown.no_show],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                    >
                      <Text size="2" className="text-slate-600">
                        {label}
                      </Text>
                      <Text size="3" className="font-semibold text-slate-900">
                        {value}
                      </Text>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <Heading size="5" className="font-display">
                  Clinic performance
                </Heading>
                {!showClinicPerformance ? (
                  <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                    <Text size="2" className="text-emerald-700">
                      {overview.clinicPerformance[0]?.clinicName ?? "Clinic"}
                    </Text>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                          Revenue
                        </Text>
                        <Text size="3" className="font-semibold text-slate-900">
                          {formatReportMoney(overview.clinicPerformance[0]?.revenueTotal ?? 0)}
                        </Text>
                      </div>
                      <div>
                        <Text size="1" className="uppercase tracking-[0.2em] text-slate-400">
                          Utilization
                        </Text>
                        <Text size="3" className="font-semibold text-slate-900">
                          {formatReportPercent(
                            overview.clinicPerformance[0]?.appointmentUtilizationRate ?? 0
                          )}
                        </Text>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="app-scrollbar mt-6 max-h-[18rem] overflow-auto pr-2">
                    <table className="min-w-full text-left text-sm text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-3 pr-4 font-medium">Clinic</th>
                          <th className="pb-3 pr-4 font-medium">Revenue</th>
                          <th className="pb-3 pr-4 font-medium">Appointments</th>
                          <th className="pb-3 pr-4 font-medium">Utilization</th>
                          <th className="pb-3 font-medium">Cancellation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.clinicPerformance.map((clinic) => (
                          <tr key={clinic.clinicId} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-3 pr-4 font-semibold text-slate-900">
                              {clinic.clinicName}
                            </td>
                            <td className="py-3 pr-4">{formatReportMoney(clinic.revenueTotal)}</td>
                            <td className="py-3 pr-4">{clinic.appointmentsTotal}</td>
                            <td className="py-3 pr-4">
                              {formatReportPercent(clinic.appointmentUtilizationRate)}
                            </td>
                            <td className="py-3">
                              {formatReportPercent(clinic.cancellationRate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </section>

            <section className="mt-10">
              <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
                <Heading size="5" className="font-display">
                  Top dispensed medicines
                </Heading>
                {overview.topDispensedMedicines.length === 0 ? (
                  <Text size="2" className="mt-4 text-slate-500">
                    No clinic-store medicines have been dispensed in this range yet.
                  </Text>
                ) : (
                  <div className="app-scrollbar mt-6 max-h-[18rem] overflow-auto pr-2">
                    <table className="min-w-full text-left text-sm text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-3 pr-4 font-medium">Medicine</th>
                          <th className="pb-3 pr-4 font-medium">Qty dispensed</th>
                          <th className="pb-3 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.topDispensedMedicines.map((item) => (
                          <tr key={item.inventoryItemId} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-3 pr-4 font-semibold text-slate-900">{item.name}</td>
                            <td className="py-3 pr-4">{item.quantityTotal}</td>
                            <td className="py-3">{formatReportMoney(item.revenueTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Reports;
