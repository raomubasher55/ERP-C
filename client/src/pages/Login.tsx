import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Heading, Text, TextField } from "@radix-ui/themes";
import { useAuth } from "../context/AuthContext";
import type { ApiError } from "../lib/api";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-gradient text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-700">
              Aero Clinic Suite
            </span>
            <Heading size="9" className="font-display text-4xl leading-tight text-slate-950 md:text-5xl">
              Welcome back. Your practice is already moving.
            </Heading>
            <Text size="4" className="max-w-xl text-slate-600">
              Sign in to manage clinics, schedules, and daily performance. Everything stays synchronized
              across your team.
            </Text>
            <div className="flex gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-emerald-100 px-3 py-1">Secure JWT</span>
              <span className="rounded-full bg-orange-100 px-3 py-1">Real-time clinics</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Modern UI</span>
            </div>
          </div>

          <Card className="border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,118,110,0.12)] backdrop-blur">
            <Heading size="6" className="font-display">
              Sign in
            </Heading>
            <Text size="2" className="text-slate-500">
              Use your clinic account credentials.
            </Text>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
                  placeholder="••••••••"
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
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <Text size="2" className="mt-4 text-slate-500">
              New to EPR?{" "}
              <Link className="text-emerald-600 hover:text-emerald-700" to="/register">
                Create an account
              </Link>
            </Text>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
