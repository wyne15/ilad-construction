"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PageHead from "@/components/PageHead";
import WeekNav from "@/components/WeekNav";
import { supabase } from "@/lib/supabase";
import { monday, todayStr } from "@/lib/dates";

type Site = { id: string; name: string };
type Goal = {
  id: string;
  site_id: string;
  title: string;
  done: boolean;
  profiles: { full_name: string } | null;
};

function GoalsAdmin() {
  const [week, setWeek] = useState(monday(todayStr()));
  const [sites, setSites] = useState<Site[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [siteId, setSiteId] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sites")
        .select("id, name")
        .eq("active", true)
        .order("name");
      const list = (data ?? []) as Site[];
      setSites(list);
      if (list.length > 0) setSiteId(list[0].id);
    })();
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("weekly_goals")
      .select("id, site_id, title, done, profiles!done_by(full_name)")
      .eq("week_start", week)
      .order("created_at");
    setGoals((data ?? []) as unknown as Goal[]);
  }, [week]);

  useEffect(() => {
    load();
  }, [load]);

  async function addGoal(e: FormEvent) {
    e.preventDefault();
    if (!siteId || !title.trim()) return;
    const { error } = await supabase
      .from("weekly_goals")
      .insert({ site_id: siteId, week_start: week, title: title.trim() });
    setMsg(error ? error.message : "");
    if (!error) setTitle("");
    await load();
  }

  async function removeGoal(id: string) {
    const { error } = await supabase.from("weekly_goals").delete().eq("id", id);
    setMsg(error ? error.message : "");
    await load();
  }

  return (
    <div className="space-y-8">
      <PageHead eyebrow="Office" title="Weekly goals" />

      <WeekNav week={week} setWeek={setWeek} />

      {msg && <p className="notice-err">{msg}</p>}

      <section className="card">
        <h2 className="card-title">Add a goal</h2>
        <form onSubmit={addGoal} className="grid gap-3 sm:grid-cols-[200px_1fr_auto]">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            aria-label="Site"
            className="input"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            placeholder="e.g. Finish blockwork on plot 12"
            aria-label="Goal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
          <button className="btn btn-primary">Add goal</button>
        </form>
      </section>

      {sites.map((s) => {
        const list = goals.filter((g) => g.site_id === s.id);
        return (
          <section key={s.id} className="card">
            <h2 className="card-title">{s.name}</h2>
            {list.length === 0 && <p className="muted">No goals this week.</p>}
            <div>
              {list.map((g) => (
                <div key={g.id} className="list-row">
                  <span className={g.done ? "muted line-through" : ""}>
                    {g.title}
                    {g.done && (
                      <span className="pill pill-done ml-2">
                        done{g.profiles ? ` by ${g.profiles.full_name}` : ""}
                      </span>
                    )}
                  </span>
                  <button onClick={() => removeGoal(g.id)} className="btn-text btn-danger">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function GoalsPage() {
  return <Shell roles={["admin"]}>{() => <GoalsAdmin />}</Shell>;
}
