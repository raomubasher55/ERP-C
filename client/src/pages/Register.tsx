import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Heading, Text, TextField } from "@radix-ui/themes";
import { useAuth } from "../context/AuthContext";
import type { ApiError } from "../lib/api";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-gradient text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,118,110,0.12)] backdrop-blur">
            <Heading size="6" className="font-display">
              Create your account
            </Heading>
            <Text size="2" className="text-slate-500">
              Set up your clinic workspace in minutes.
            </Text>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm text-slate-600">
                Full name
                <TextField.Root
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  type="text"
                  placeholder="Dr. Ayesha"
                  className="mt-2"
                  required
                />
              </label>
              <label className="block text-sm text-slate-600">
                Email
                <TextField.Root
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@clinic.com"
                  className="mt-2"
                  required
                />
              </label>
              <label className="block text-sm text-slate-600">
                Password
                <TextField.Root
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="At least 8 characters"
                  className="mt-2"
                  required
                />
              </label>
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              ) : null}
              <Button type="submit" size="3" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <Text size="2" className="mt-4 text-slate-500">
              Already have an account?{" "}
              <Link className="text-emerald-600 hover:text-emerald-700" to="/login">
                Sign in
              </Link>
            </Text>
          </Card>

          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-orange-200 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-600">
              Built for clinics
            </span>
            <Heading size="9" className="font-display text-4xl leading-tight text-slate-950 md:text-5xl">
              Design a calm, high-performance care experience.
            </Heading>
            <Text size="4" className="max-w-xl text-slate-600">
              EPR keeps your daily operations aligned: clinics, schedules, and patient touchpoints in
              one modern workspace.
            </Text>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: "Fast onboarding", body: "Create a clinic in minutes with guided setup." },
                { title: "Automated reminders", body: "Send WhatsApp and online booking updates." },
                { title: "Smart insights", body: "Track performance and patient flow daily." },
                { title: "Secure by default", body: "JWT auth and modern security standards." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-emerald-100 bg-white/70 p-4 text-sm text-slate-600 shadow-sm"
                >
                  <div className="font-semibold text-slate-800">{item.title}</div>
                  <div className="mt-1 text-slate-500">{item.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
