export type HoursRow = {
  week_start: string;
  site: string;
  worker: string;
  total_hours: number;
};

// Total hours per worker across all sites, as [worker, hours] pairs.
// Postgres numeric values can arrive as strings, so each value is converted with Number().
export function totalsByWorker(
  rows: Pick<HoursRow, "worker" | "total_hours">[]
): [string, number][] {
  const perWorker = new Map<string, number>();
  rows.forEach((r) =>
    perWorker.set(r.worker, (perWorker.get(r.worker) ?? 0) + Number(r.total_hours))
  );
  return Array.from(perWorker.entries());
}
