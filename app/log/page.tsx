"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PageHead from "@/components/PageHead";
import { supabase } from "@/lib/supabase";
import { monday, todayStr } from "@/lib/dates";

type Site = { id: string; name: string };
type Worker = { id: string; full_name: string };
type Item = { plot: string; lift: string; description: string; is_extra: boolean };
type Goal = {
  id: string;
  title: string;
  done: boolean;
  profiles: { full_name: string } | null;
};
type HistoryLog = {
  id: string;
  log_date: string;
  creator: { full_name: string } | null;
  log_attendance: { hours: number; workers: { full_name: string } | null }[];
  log_work_items: { plot: string; lift: string | null; description: string; is_extra: boolean }[];
};

const emptyItem = (): Item => ({ plot: "", lift: "", description: "", is_extra: false });

function LogForm({ isAdmin }: { isAdmin: boolean }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [siteId, setSiteId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [hours, setHours] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [notes, setNotes] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, w] = await Promise.all([
        supabase.from("sites").select("id, name").eq("active", true).order("name"),
        supabase.from("workers").select("id, full_name").eq("active", true).order("full_name"),
      ]);
      const list = (s.data ?? []) as Site[];
      setSites(list);
      setWorkers((w.data ?? []) as Worker[]);
      if (list.length > 0) setSiteId(list[0].id);
    })();
  }, []);

  const loadLog = useCallback(async () => {
    if (!siteId) return;
    setMsg("");
    const { data } = await supabase
      .from("daily_logs")
      .select(
        "id, notes, log_attendance(worker_id, hours), log_work_items(plot, lift, description, is_extra)"
      )
      .eq("site_id", siteId)
      .eq("log_date", date)
      .maybeSingle();

    if (data) {
      const h: Record<string, string> = {};
      (data.log_attendance as { worker_id: string; hours: number }[]).forEach((a) => {
        h[a.worker_id] = String(a.hours);
      });
      setHours(h);
      const it = (
        data.log_work_items as {
          plot: string;
          lift: string | null;
          description: string;
          is_extra: boolean;
        }[]
      ).map((i) => ({
        plot: i.plot,
        lift: i.lift ?? "",
        description: i.description,
        is_extra: i.is_extra,
      }));
      setItems(it.length ? it : [emptyItem()]);
      setNotes((data.notes as string | null) ?? "");
    } else {
      setHours({});
      setItems([emptyItem()]);
      setNotes("");
    }
  }, [siteId, date]);

  const loadGoals = useCallback(async () => {
    if (!siteId) return;
    const { data } = await supabase
      .from("weekly_goals")
      .select("id, title, done, profiles!done_by(full_name)")
      .eq("site_id", siteId)
      .eq("week_start", monday(date))
      .order("created_at");
    setGoals((data ?? []) as unknown as Goal[]);
  }, [siteId, date]);

  const loadHistory = useCallback(async () => {
    if (!siteId) return;
    const { data } = await supabase
      .from("daily_logs")
      .select(
        "id, log_date, creator:profiles!created_by(full_name), log_attendance(hours, workers(full_name)), log_work_items(plot, lift, description, is_extra)"
      )
      .eq("site_id", siteId)
      .order("log_date", { ascending: false })
      .limit(10);
    setHistory((data ?? []) as unknown as HistoryLog[]);
  }, [siteId]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function updateItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function toggleGoal(goal: Goal, done: boolean) {
    const { error } = await supabase.rpc("set_goal_done", { p_goal: goal.id, p_done: done });
    if (error) setMsg(error.message);
    await loadGoals();
  }

  async function save() {
    if (!siteId) return;
    const att = workers
      .map((w) => ({ worker_id: w.id, hours: parseFloat(hours[w.id] ?? "") }))
      .filter((a) => !isNaN(a.hours) && a.hours > 0);
    if (att.some((a) => a.hours > 24)) {
      setMsg("Hours must be 24 or less per person.");
      return;
    }
    const work = items.filter((i) => i.plot.trim() && i.description.trim());

    setBusy(true);
    setMsg("");

    const { data: log, error } = await supabase
      .from("daily_logs")
      .upsert({ site_id: siteId, log_date: date, notes: notes || null }, { onConflict: "site_id,log_date" })
      .select("id")
      .single();

    if (error || !log) {
      setMsg(error?.message ?? "Could not save.");
      setBusy(false);
      return;
    }

    await supabase.from("log_attendance").delete().eq("daily_log_id", log.id);
    await supabase.from("log_work_items").delete().eq("daily_log_id", log.id);

    const e1 = att.length
      ? (
          await supabase
            .from("log_attendance")
            .insert(att.map((a) => ({ ...a, daily_log_id: log.id })))
        ).error
      : null;

    const e2 = work.length
      ? (
          await supabase.from("log_work_items").insert(
            work.map((i) => ({
              daily_log_id: log.id,
              plot: i.plot.trim(),
              lift: i.lift.trim() || null,
              description: i.description.trim(),
              is_extra: i.is_extra,
            }))
          )
        ).error
      : null;

    const err = e1 ?? e2;
    setMsg(err ? err.message : "Saved.");
    setBusy(false);
    await loadHistory();
  }

  return (
    <div className="space-y-8">
      <PageHead eyebrow="Site" title="Daily site log" />
      {isAdmin && (
        <p className="muted text-sm">
          Logging as admin: you can fill in the log for any active site.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          Site
          <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Date
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>

      {sites.length === 0 && (
        <p className="notice-err">No site assigned to you yet. Ask the admin.</p>
      )}

      <section className="card">
        <h2 className="card-title">Goals for this week</h2>
        {goals.length === 0 && <p className="muted">No goals set for this week.</p>}
        <div className="space-y-3">
          {goals.map((g) => (
            <label key={g.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={g.done}
                onChange={(e) => toggleGoal(g, e.target.checked)}
              />
              <span className={g.done ? "muted line-through" : ""}>{g.title}</span>
              {g.done && g.profiles && (
                <span className="pill pill-done">{g.profiles.full_name}</span>
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Who worked today</h2>
        {workers.length === 0 && <p className="muted">No workers added yet.</p>}
        <div className="grid gap-x-10 sm:grid-cols-2">
          {workers.map((w) => (
            <label key={w.id} className="hours-row">
              <span>{w.full_name}</span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  placeholder="0"
                  className="input w-24 text-right"
                  value={hours[w.id] ?? ""}
                  onChange={(e) => setHours((prev) => ({ ...prev, [w.id]: e.target.value }))}
                />
                <span className="muted text-sm">h</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Work done</h2>
        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={i} className="work-item space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  placeholder="Plot"
                  aria-label="Plot"
                  className="input"
                  value={it.plot}
                  onChange={(e) => updateItem(i, { plot: e.target.value })}
                />
                <input
                  placeholder="Lift (optional)"
                  aria-label="Lift"
                  className="input"
                  value={it.lift}
                  onChange={(e) => updateItem(i, { lift: e.target.value })}
                />
              </div>
              <textarea
                placeholder="What was done"
                aria-label="What was done"
                rows={2}
                className="input"
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={it.is_extra}
                    onChange={(e) => updateItem(i, { is_extra: e.target.checked })}
                  />
                  Extra work
                </label>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                    className="btn-text btn-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="btn btn-sm mt-4"
        >
          + Add work item
        </button>
      </section>

      <label className="label">
        Notes (optional)
        <textarea
          rows={2}
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button onClick={save} disabled={busy || !siteId} className="btn btn-primary">
          {busy ? "Saving…" : "Save log"}
        </button>
        {msg && (
          <p className={msg === "Saved." ? "notice-ok" : "notice-err"} role="status">
            {msg}
          </p>
        )}
      </div>

      <section className="card">
        <h2 className="card-title">Site history</h2>
        {history.length === 0 && <p className="muted">Nothing logged on this site yet.</p>}
        <div className="space-y-4">
          {history.map((l) => (
            <div key={l.id} className="history-item space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="num">{l.log_date}</strong>
                <span className="muted text-sm">
                  entered by {l.creator?.full_name ?? "unknown"}
                </span>
              </div>
              <p className="muted text-sm">
                {l.log_attendance.length
                  ? l.log_attendance
                      .map((a) => `${a.workers?.full_name ?? "?"} ${a.hours} h`)
                      .join(", ")
                  : "No hours"}
              </p>
              <ul className="work-list">
                {l.log_work_items.map((it, i) => (
                  <li key={i}>
                    Plot {it.plot}
                    {it.lift ? `, Lift ${it.lift}` : ""} — {it.description}
                    {it.is_extra && <span className="pill pill-extra ml-2">extra</span>}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setDate(l.log_date);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="btn btn-sm"
              >
                Open this day
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function LogPage() {
  return (
    <Shell roles={["site_lead", "admin"]}>
      {(profile) => <LogForm isAdmin={profile.role === "admin"} />}
    </Shell>
  );
}
