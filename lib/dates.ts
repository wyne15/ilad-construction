export const todayStr = () => new Date().toISOString().slice(0, 10);

export function addDays(d: string, n: number) {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Monday of the week containing date d (matches Postgres date_trunc('week'))
export function monday(d: string) {
  const dt = new Date(d + "T00:00:00Z");
  return addDays(d, -((dt.getUTCDay() + 6) % 7));
}
