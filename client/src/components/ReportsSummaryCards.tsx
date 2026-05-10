import { useEffect, useState } from "react";
import { Card, Heading, Text } from "@radix-ui/themes";
import { api } from "../lib/api";
import { formatReportMoney, formatReportPercent } from "../lib/reports";
import type { ReportsOverview } from "../types/api";

type ReportsSummaryCardsProps = {
  token: string;
  clinicId?: string;
  preset?: "today" | "7d" | "30d";
  title?: string;
};

const ReportsSummaryCards = ({
  token,
  clinicId,
  preset = "7d",
  title = "Analytics snapshot",
}: ReportsSummaryCardsProps) => {
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ preset });
        if (clinicId) {
          params.set("clinicId", clinicId);
        }
        const res = await api.get<ReportsOverview>(`/api/reports/overview?${params}`, token);
        if (active) {
          setOverview(res);
        }
      } catch (err) {
        if (active) {
          const message =
            (err as { message?: string })?.message || "Unable to load analytics snapshot";
          setError(message);
          setOverview(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      active = false;
    };
  }, [clinicId, preset, token]);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <Heading size="6" className="font-display">
          {title}
        </Heading>
        <Text size="2" className="text-slate-500">
          {preset === "today" ? "Today" : preset === "30d" ? "Last 30 days" : "Last 7 days"}
        </Text>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {loading ? (
          <Card className="border border-slate-200 bg-white/70 p-6 md:col-span-4">
            <Text size="2" className="text-slate-500">
              Loading analytics...
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
                className="border border-slate-200 bg-white/85 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]"
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
      </div>
    </section>
  );
};

export default ReportsSummaryCards;
