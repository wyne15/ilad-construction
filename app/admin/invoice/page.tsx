"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import PageHead from "@/components/PageHead";
import BrandMark from "@/components/BrandMark";
import { supabase } from "@/lib/supabase";
import { addDays, monday, todayStr } from "@/lib/dates";

type Line = { description: string; quantity: string; unit_price: string };

type WorkRow = {
  log_date: string;
  site: string;
  plot: string;
  lift: string | null;
  description: string;
  is_extra: boolean;
};

const money = (n: number) => `£${n.toFixed(2)}`;

function InvoiceBuilder() {
  const [from, setFrom] = useState(monday(todayStr()));
  const [to, setTo] = useState(addDays(monday(todayStr()), 6));
  const [contractor, setContractor] = useState("");
  const [number, setNumber] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [msg, setMsg] = useState("");

  async function loadWork() {
    setMsg("");
    const { data, error } = await supabase
      .from("weekly_work")
      .select("log_date, site, plot, lift, description, is_extra")
      .gte("log_date", from)
      .lte("log_date", to)
      .order("log_date");
    if (error) {
      setMsg(error.message);
      return;
    }
    const rows = (data ?? []) as WorkRow[];
    setLines(
      rows.map((r) => ({
        description: `${r.site} – Plot ${r.plot}${r.lift ? `, Lift ${r.lift}` : ""}: ${r.description}${
          r.is_extra ? " (extra)" : ""
        }`,
        quantity: "1",
        unit_price: "",
      }))
    );
    if (rows.length === 0) setMsg("No work logged in this period.");
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const lineTotal = (l: Line) => (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  async function saveDraft() {
    if (!number.trim() || !contractor.trim() || lines.length === 0) {
      setMsg("Invoice number, contractor and at least one line are required.");
      return;
    }
    const { data: inv, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: number.trim(),
        contractor_name: contractor.trim(),
        period_start: from,
        period_end: to,
      })
      .select("id")
      .single();
    if (error || !inv) {
      setMsg(error?.message ?? "Could not save invoice.");
      return;
    }
    const { error: e2 } = await supabase.from("invoice_lines").insert(
      lines.map((l) => ({
        invoice_id: inv.id,
        description: l.description,
        quantity: parseFloat(l.quantity) > 0 ? parseFloat(l.quantity) : 1,
        unit_price: l.unit_price === "" ? null : parseFloat(l.unit_price),
      }))
    );
    setMsg(e2 ? e2.message : "Draft saved.");
  }

  return (
    <div className="space-y-8">
      <div className="print:hidden">
        <PageHead eyebrow="Office" title="Invoice" />
      </div>

      <section className="card space-y-4 print:hidden">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            Contractor
            <input
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              className="input"
            />
          </label>
          <label className="label">
            Invoice number
            <input value={number} onChange={(e) => setNumber(e.target.value)} className="input" />
          </label>
          <label className="label">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input"
            />
          </label>
          <label className="label">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={loadWork} className="btn btn-primary">
            Load work from logs
          </button>
          <button
            onClick={() =>
              setLines((prev) => [...prev, { description: "", quantity: "1", unit_price: "" }])
            }
            className="btn"
          >
            + Add line
          </button>
          <button onClick={saveDraft} className="btn">
            Save draft
          </button>
          <button onClick={() => window.print()} className="btn">
            Print / Save as PDF
          </button>
          {msg && (
            <p className={msg === "Draft saved." ? "notice-ok" : "notice-err"} role="status">
              {msg}
            </p>
          )}
        </div>
      </section>

      {lines.length > 0 && (
        <section className="paper">
          <div className="brick-strip" aria-hidden="true" />
          <div className="paper-body">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div className="brand">
                <BrandMark size={44} />
                <div>
                  <p className="brand-name brand-name-dark">ILAD Construction</p>
                  <p className="muted text-sm">Invoice</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">No. {number || "—"}</p>
                <p className="muted">
                  Period: {from} to {to}
                </p>
                <p className="muted">To: {contractor || "—"}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="tbl min-w-[560px]">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="w-20">Qty</th>
                    <th className="w-32">Unit price (£)</th>
                    <th className="w-24 text-right">Total</th>
                    <th className="w-8 print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="pr-2 align-top">
                        <textarea
                          rows={2}
                          aria-label="Description"
                          value={l.description}
                          onChange={(e) => updateLine(i, { description: e.target.value })}
                          className="input print:border-0 print:p-0"
                        />
                      </td>
                      <td className="pr-2 align-top">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          aria-label="Quantity"
                          value={l.quantity}
                          onChange={(e) => updateLine(i, { quantity: e.target.value })}
                          className="input print:border-0 print:p-0"
                        />
                      </td>
                      <td className="pr-2 align-top">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter price"
                          aria-label="Unit price"
                          value={l.unit_price}
                          onChange={(e) => updateLine(i, { unit_price: e.target.value })}
                          className={`input print:border-0 print:p-0 ${
                            l.unit_price === "" ? "noprice" : ""
                          }`}
                        />
                      </td>
                      <td className="num py-3 text-right align-top">{money(lineTotal(l))}</td>
                      <td className="text-right align-top print:hidden">
                        <button
                          onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                          className="btn-text btn-danger"
                          aria-label="Remove line"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right font-semibold">
                      Total
                    </td>
                    <td className="num text-right text-lg font-semibold">{money(total)}</td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function InvoicePage() {
  return <Shell roles={["admin"]}>{() => <InvoiceBuilder />}</Shell>;
}
