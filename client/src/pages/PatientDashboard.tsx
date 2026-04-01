import { Button, Card, Heading, Text } from "@radix-ui/themes";
import { useAuth } from "../context/AuthContext";
import TopNav from "../components/TopNav";

const PatientDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-app-gradient text-slate-950">
      <TopNav />
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Text size="2" className="uppercase tracking-[0.2em] text-emerald-600">
              Patient Portal
            </Text>
            <Heading size="8" className="font-display">
              {user ? `Hi, ${user.name}` : "Welcome"}
            </Heading>
            <Text size="3" className="text-slate-500">
              Your patient dashboard is ready for upcoming appointments and updates.
            </Text>
          </div>
        </header>

        <section className="mt-10">
          <Card className="border border-emerald-200 bg-emerald-50/70 p-6">
            <Heading size="5" className="font-display">
              Your care hub
            </Heading>
            <Text size="3" className="mt-2 text-slate-600">
              Keep track of upcoming visits, reminders, and messages from your clinic.
            </Text>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="2" variant="solid" disabled>
                Request appointment
              </Button>
              <Button size="2" variant="soft" disabled>
                Contact clinic
              </Button>
            </div>
          </Card>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { label: "Upcoming visits", value: "0" },
            { label: "Reminders", value: "0" },
            { label: "Messages", value: "0" },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,118,110,0.08)]"
            >
              <Text size="2" className="text-slate-500">
                {stat.label}
              </Text>
              <Heading size="8" className="font-display text-slate-900">
                {stat.value}
              </Heading>
            </Card>
          ))}
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Card className="border border-slate-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,118,110,0.08)]">
            <Heading size="5" className="font-display">
              No appointments yet
            </Heading>
            <Text size="3" className="mt-2 text-slate-600">
              As soon as a clinic schedules your visit, details will appear here.
            </Text>
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              We will show visit time, doctor, and location once confirmed.
            </div>
          </Card>

          <Card className="border border-emerald-100 bg-emerald-50/60 p-6">
            <Heading size="5" className="font-display">
              Next steps
            </Heading>
            <Text size="3" className="mt-2 text-slate-600">
              Contact your clinic to request an appointment or ask an admin to enable online
              booking.
            </Text>
            <div className="mt-4 space-y-2 text-sm text-emerald-700">
              <div>• Keep your phone number updated for reminders.</div>
              <div>• Check back here for confirmations and updates.</div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default PatientDashboard;
