"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BrandMark from "@/components/BrandMark";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else router.push("/dashboard");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) setMsg(error.message);
      else if (data.session) router.push("/dashboard");
      else setMsg("Account created. Check your email to confirm it, then log in.");
    }
    setBusy(false);
  }

  return (
    <main className="auth">
      <section className="auth-hero">
        <div className="brand">
          <BrandMark size={44} />
          <div>
            <p className="brand-name">ILAD Construction</p>
            <p className="brand-sub">Panel Control</p>
          </div>
        </div>
        <div>
          <p className="eyebrow eyebrow-light">Site hours · Weekly reports · Invoices</p>
          <h1 className="auth-title">Every hour on every site, accounted for.</h1>
          <p className="auth-lede">
            Site leads log the day. The office gets the weekly report and builds
            the invoice from it.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{mode === "login" ? "Welcome back" : "Request access"}</p>
          <h2 className="auth-form-title">
            {mode === "login" ? "Log in" : "Create your account"}
          </h2>

          <form onSubmit={submit} className="card mt-6 space-y-4">
            {mode === "signup" && (
              <label className="label">
                Full name
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                />
              </label>
            )}
            <label className="label">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </label>
            <label className="label">
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </label>
            {msg && <p className="notice-err">{msg}</p>}
            <button disabled={busy} className="btn btn-primary w-full">
              {mode === "login" ? "Log in" : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMsg("");
              }}
              className="btn-text w-full"
            >
              {mode === "login" ? "No account? Sign up" : "Have an account? Log in"}
            </button>
          </form>
          <p className="muted mt-4 text-sm">
            New accounts see no data until an admin approves them.
          </p>
        </div>
      </section>
    </main>
  );
}
