import { describe, it, expect } from "vitest";
import { totalsByWorker } from "../lib/report";

describe("totalsByWorker", () => {
  it("adds one worker's hours across two sites", () => {
    const rows = [
      { worker: "Test Worker A", total_hours: 8 },
      { worker: "Test Worker A", total_hours: 4 },
      { worker: "Test Worker B", total_hours: 7.5 },
    ];
    expect(totalsByWorker(rows)).toEqual([
      ["Test Worker A", 12],
      ["Test Worker B", 7.5],
    ]);
  });

  it("returns an empty list when there are no rows", () => {
    expect(totalsByWorker([])).toEqual([]);
  });

  it("accepts numeric strings, as Postgres numeric values may arrive", () => {
    const rows = [{ worker: "Test Worker A", total_hours: "7.50" as unknown as number }];
    expect(totalsByWorker(rows)).toEqual([["Test Worker A", 7.5]]);
  });
});
