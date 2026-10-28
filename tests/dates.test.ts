import { describe, it, expect } from "vitest";
import { addDays, monday } from "../lib/dates";

describe("monday", () => {
  it("returns the Monday of a midweek date", () => {
    expect(monday("2026-10-28")).toBe("2026-10-26"); // Wednesday
  });
  it("returns the same day when the date is already a Monday", () => {
    expect(monday("2026-10-26")).toBe("2026-10-26");
  });
  it("treats Sunday as the end of the week, not the start", () => {
    expect(monday("2026-11-01")).toBe("2026-10-26"); // Sunday
  });
});

describe("addDays", () => {
  it("moves across a month boundary", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });
});
