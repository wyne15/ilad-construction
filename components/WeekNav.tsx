import { addDays } from "@/lib/dates";

export default function WeekNav({
  week,
  setWeek,
}: {
  week: string;
  setWeek: (w: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={() => setWeek(addDays(week, -7))} className="btn btn-sm">
        ← Previous
      </button>
      <span className="week-label">
        Week of {week} to {addDays(week, 6)}
      </span>
      <button onClick={() => setWeek(addDays(week, 7))} className="btn btn-sm">
        Next →
      </button>
    </div>
  );
}
