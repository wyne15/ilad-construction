"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PageHead from "@/components/PageHead";
import { supabase, Profile, Role } from "@/lib/supabase";

type Site = { id: string; name: string; site_lead_id: string | null; active: boolean };
type Worker = { id: string; full_name: string; active: boolean };

function AdminPanel({ me }: { me: Profile }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [siteName, setSiteName] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [u, s, w] = await Promise.all([
      supabase.from("profiles").select("id, full_name, role").order("created_at", { ascending: false }),
      supabase.from("sites").select("id, name, site_lead_id, active").order("name"),
      supabase.from("workers").select("id, full_name, active").order("full_name"),
    ]);
    setUsers((u.data ?? []) as Profile[]);
    setSites((s.data ?? []) as Site[]);
    setWorkers((w.data ?? []) as Worker[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    setMsg(error ? error.message : "");
    await load();
  }

  const setRole = (id: string, role: Role) =>
    run(supabase.from("profiles").update({ role }).eq("id", id));

  const assignLead = (siteId: string, leadId: string) =>
    run(supabase.from("sites").update({ site_lead_id: leadId || null }).eq("id", siteId));

  const toggleSite = (s: Site) =>
    run(supabase.from("sites").update({ active: !s.active }).eq("id", s.id));

  const toggleWorker = (w: Worker) =>
    run(supabase.from("workers").update({ active: !w.active }).eq("id", w.id));

  async function addSite(e: FormEvent) {
    e.preventDefault();
    if (!siteName.trim()) return;
    await run(supabase.from("sites").insert({ name: siteName.trim() }));
    setSiteName("");
  }

  async function addWorker(e: FormEvent) {
    e.preventDefault();
    if (!workerName.trim()) return;
    await run(supabase.from("workers").insert({ full_name: workerName.trim() }));
    setWorkerName("");
  }

  const leads = users.filter((u) => u.role === "site_lead" || u.role === "admin");

  return (
    <div className="space-y-8">
      <PageHead eyebrow="Office" title="Admin" />
      {msg && <p className="notice-err">{msg}</p>}

      <section className="card">
        <h2 className="card-title">Users</h2>
        <div>
          {users.map((u) => (
            <div key={u.id} className="list-row">
              <span>
                {u.full_name}
                {u.role === "pending" && <span className="pill pill-extra ml-2">new</span>}
              </span>
              <select
                disabled={u.id === me.id}
                value={u.role}
                onChange={(e) => setRole(u.id, e.target.value as Role)}
                aria-label={`Role for ${u.full_name}`}
                className="input w-auto"
              >
                <option value="pending">pending</option>
                <option value="site_lead">site_lead</option>
                <option value="admin">admin</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Sites</h2>
        <form onSubmit={addSite} className="mb-4 flex gap-2">
          <input
            placeholder="New site name (e.g. Daventry)"
            aria-label="New site name"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="input flex-1"
          />
          <button className="btn btn-primary">Add</button>
        </form>
        <div>
          {sites.map((s) => (
            <div key={s.id} className="list-row">
              <span className={s.active ? "" : "muted line-through"}>{s.name}</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={s.site_lead_id ?? ""}
                  onChange={(e) => assignLead(s.id, e.target.value)}
                  aria-label={`Site lead for ${s.name}`}
                  className="input w-auto"
                >
                  <option value="">No site lead</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name}
                    </option>
                  ))}
                </select>
                <button onClick={() => toggleSite(s)} className="btn btn-sm">
                  {s.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Workers</h2>
        <form onSubmit={addWorker} className="mb-4 flex gap-2">
          <input
            placeholder="New worker name"
            aria-label="New worker name"
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            className="input flex-1"
          />
          <button className="btn btn-primary">Add</button>
        </form>
        <div>
          {workers.map((w) => (
            <div key={w.id} className="list-row">
              <span className={w.active ? "" : "muted line-through"}>{w.full_name}</span>
              <button onClick={() => toggleWorker(w)} className="btn btn-sm">
                {w.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  return <Shell roles={["admin"]}>{(profile) => <AdminPanel me={profile} />}</Shell>;
}
