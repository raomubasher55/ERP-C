import { Badge, Button, Card, Heading, Text } from "@radix-ui/themes";
import { Link } from "react-router-dom";

const planCards = [
  {
    name: "Starter",
    accent: "border-slate-200 bg-white/90",
    badgeColor: "gray" as const,
    description: "For a single clinic that needs appointments, billing, and patient self-service.",
    points: [
      "1 clinic workspace",
      "Appointments and billing",
      "Patient self-booking",
      "Basic operational visibility",
    ],
  },
  {
    name: "Pro",
    accent: "border-sky-200 bg-sky-50/70",
    badgeColor: "blue" as const,
    description: "For growing clinics that need inventory, reports, and stronger team operations.",
    points: [
      "Up to 3 clinics",
      "Inventory and reports",
      "More staff capacity",
      "Stronger day-to-day control",
    ],
  },
  {
    name: "Premium",
    accent: "border-emerald-200 bg-emerald-50/70",
    badgeColor: "green" as const,
    description: "For multi-site or high-volume clinics that want advanced analytics and scale.",
    points: [
      "High or unlimited limits",
      "Advanced analytics",
      "Reminder-ready workflows",
      "Future enterprise expansion",
    ],
  },
];

const billingCycles = [
  {
    label: "Monthly",
    detail: "Fast onboarding with lower commitment.",
  },
  {
    label: "Quarterly",
    detail: "Balanced option for clinics stabilizing operations.",
  },
  {
    label: "Annual",
    detail: "Best long-term fit for established clinics and multi-site teams.",
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-app-gradient text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-emerald-100/70 bg-white/70 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
              EPR
            </div>
            <Text size="2" className="text-slate-600">
              Clinic ERP for appointments, billing, inventory, and reporting
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="soft">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <Badge variant="soft" color="green">
              Multi-role clinic operations
            </Badge>
            <Heading size="9" className="mt-4 max-w-3xl font-display text-slate-950">
              One workspace for clinic owners, staff, and patients.
            </Heading>
            <Text size="4" className="mt-4 max-w-2xl text-slate-600">
              EPR connects appointment booking, invoices, receipts, stock workflows, and clinic
              reporting so teams can move from visit to payment without breaking context.
            </Text>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="3">
                <Link to="/register">Create account</Link>
              </Button>
              <Button asChild size="3" variant="soft">
                <Link to="/login">Open workspace</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Card className="border border-emerald-100 bg-white/85 p-5">
                <Text size="1" className="uppercase tracking-[0.18em] text-emerald-600">
                  Appointments
                </Text>
                <Text size="3" className="mt-2 font-semibold text-slate-900">
                  Patient booking and staff scheduling
                </Text>
              </Card>
              <Card className="border border-sky-100 bg-white/85 p-5">
                <Text size="1" className="uppercase tracking-[0.18em] text-sky-600">
                  Billing
                </Text>
                <Text size="3" className="mt-2 font-semibold text-slate-900">
                  Invoices, edits, receipts, and payment tracking
                </Text>
              </Card>
              <Card className="border border-amber-100 bg-white/85 p-5">
                <Text size="1" className="uppercase tracking-[0.18em] text-amber-600">
                  Operations
                </Text>
                <Text size="3" className="mt-2 font-semibold text-slate-900">
                  Inventory alerts, procurement, and clinic analytics
                </Text>
              </Card>
            </div>
          </div>

          <Card className="border border-slate-200 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,118,110,0.12)]">
            <Text size="1" className="uppercase tracking-[0.22em] text-emerald-600">
              Subscription structure
            </Text>
            <Heading size="6" className="mt-2 font-display">
              Plans should control features, limits, and time-based access.
            </Heading>
            <Text size="3" className="mt-3 text-slate-600">
              The next product step is turning `starter`, `pro`, and `premium` into real
              subscription tiers with monthly, quarterly, and annual billing cycles.
            </Text>

            <div className="mt-6 space-y-3">
              {billingCycles.map((cycle) => (
                <div
                  key={cycle.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Text size="3" className="font-semibold text-slate-900">
                      {cycle.label}
                    </Text>
                    <Badge variant="soft" color="green">
                      Billing cycle
                    </Badge>
                  </div>
                  <Text size="2" className="mt-2 text-slate-600">
                    {cycle.detail}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-14">
          <div className="text-right">
            <Text size="1" className="uppercase tracking-[0.24em] text-emerald-600">
              Plan tiers
            </Text>
            <Heading size="7" className="mt-2 font-display">
              Start simple, then scale into deeper clinic operations.
            </Heading>
            <Text size="3" className="mt-3 text-slate-600">
              Plans should reflect real clinic maturity: a basic startup clinic, a growing
              multi-staff clinic, and a high-capacity operation with advanced analytics.
            </Text>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {planCards.map((plan) => (
              <Card
                key={plan.name}
                className={`rounded-[28px] border p-6 shadow-[0_18px_50px_rgba(15,118,110,0.08)] ${plan.accent}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Heading size="6" className="font-display text-slate-950">
                    {plan.name}
                  </Heading>
                  <Badge variant="soft" color={plan.badgeColor}>
                    Plan
                  </Badge>
                </div>

                <Text size="3" className="mt-3 text-slate-600">
                  {plan.description}
                </Text>

                <div className="mt-5 space-y-3">
                  {plan.points.map((point) => (
                    <div
                      key={point}
                      className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm text-slate-700"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
