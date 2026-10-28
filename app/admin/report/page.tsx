"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PageHead from "@/components/PageHead";
import WeekNav from "@/components/WeekNav";
import { supabase } from "@/lib/supabase";
import { monday, todayStr } from "@/lib/dates";
import { totalsByWorker } from "@/lib/report";

type HoursRow = { week_start: string; site: string; worker: string; total_hours: number };
type WorkRow = {
  week_start: string;
  log_date: string;
  site: string;
  plot: string;
  lift: string | null;
  description: string;
  is_extra: boolean;
};

const fmt = (n: number) => String(Math.round(n * 100) / 100);

function Report() {
  const [week, setWeek] = useState(monday(todayStr()));
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [work, setWork] = useState<WorkRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [h, w] = await Promise.all([
        supabase.from("weekly_hours").select("*").eq("week_start", week).order("site").order("worker"),
        supabase.from("weekly_work").select("*").eq("week_start", week).order("log_date").order("site"),
      ]);
      if (!active) return;
      setHours((h.data ?? []) as HoursRow[]);
      setWork((w.data ?? []) as WorkRow[]);
    })();
    return () => {
      active = false;
    };
  }, [week]);

  const people = totalsByWorker(hours);
  const grandTotal = people.reduce((sum, [, v]) => sum + v, 0);
  const maxPerson = people.reduce((m, [, v]) => Math.max(m, v), 0);
  const extraCount = work.filter((w) => w.is_extra).length;
  const hourSites = Array.from(new Set(hours.map((h) => h.site)));
  const workSites = Array.from(new Set(work.map((w) => w.site)));

  function exportCsv() {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [
      "site,worker,hours",
      ...hours.map((h) => `${q(h.site)},${q(h.worker)},${h.total_hours}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hours-${week}.csv`;
    a.click();
  }

  return (
    <div className="space-y-8">
      <PageHead eyebrow="Office" title="Weekly report" />

      <div className="flex flex-wrap items-center gap-3">
        <WeekNav week={week} setWeek={setWeek} />
        <input
          type="date"
          value={week}
          onChange={(e) => e.target.value && setWeek(monday(e.target.value))}
          aria-label="Pick a date in the week"
          className="input w-auto"
        />
        <button
          onClick={exportCsv}
          disabled={hours.length === 0}
          className="btn btn-primary btn-sm ml-auto"
        >
          Export CSV
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <p className="eyebrow">Total hours</p>
          <p className="stat-value">
            {fmt(grandTotal)}
            <span className="stat-unit">h</span>
          </p>
        </div>
        <div className="stat">
          <p className="eyebrow">People on site</p>
          <p className="stat-value">{people.length}</p>
        </div>
        <div className="stat">
          <p className="eyebrow">Extra work items</p>
          <p className="stat-value">{extraCount}</p>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">Total hours per person</h2>
        {people.length === 0 && <p className="muted">No hours logged this week.</p>}
        {people.length > 0 && (
          <table className="tbl">
            <tbody>
              {people.map(([name, total]) => (
                <tr key={name}>
                  <td className="w-1/3">{name}</td>
                  <td className="pr-4">
                    <div className="bar">
                      <span style={{ width: `${maxPerson ? (total / maxPerson) * 100 : 0}%` }} />
                    </div>
                  </td>
                  <td className="num text-right">{fmt(total)} h</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="font-semibold">
                  All workers
                </td>
                <td className="num text-right font-semibold">{fmt(grandTotal)} h</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Hours by site</h2>
        {hourSites.length === 0 && <p className="muted">Nothing to show.</p>}
        <div className="space-y-6">
          {hourSites.map((site) => (
            <div key={site}>
              <h3 className="mb-2 text-lg">{site}</h3>
              <table className="tbl">
                <tbody>
                  {hours
                    .filter((h) => h.site === site)
                    .map((h) => (
                      <tr key={h.worker}>
                        <td>{h.worker}</td>
                        <td className="num text-right">{fmt(Number(h.total_hours))} h</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Work done</h2>
        {workSites.length === 0 && <p className="muted">No work logged this week.</p>}
        <div className="space-y-6">
          {workSites.map((site) => (
            <div key={site}>
              <h3 className="mb-2 text-lg">{site}</h3>
              <ul className="work-list">
                {work
                  .filter((w) => w.site === site)
                  .map((w, i) => (
                    <li key={i}>
                      <span className="date-tag">{w.log_date}</span>
                      Plot {w.plot}
                      {w.lift ? `, Lift ${w.lift}` : ""} — {w.description}
                      {w.is_extra && <span className="pill pill-extra ml-2">extra</span>}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ReportPage() {
  return <Shell roles={["admin"]}>{() => <Report />}</Shell>;
}
