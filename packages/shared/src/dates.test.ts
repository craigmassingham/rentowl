import { describe, expect, it } from "vitest";
import { daysUntil, nextRentDueDate } from "./dates";

describe("nextRentDueDate", () => {
  it("returns this month when the due day is still ahead", () => {
    const from = new Date(2026, 6, 10); // 10 Jul 2026
    expect(nextRentDueDate(15, from)).toEqual(new Date(2026, 6, 15));
  });

  it("returns today when the due day is today", () => {
    const from = new Date(2026, 6, 15);
    expect(nextRentDueDate(15, from)).toEqual(new Date(2026, 6, 15));
  });

  it("rolls to next month when the due day has passed", () => {
    const from = new Date(2026, 6, 20);
    expect(nextRentDueDate(15, from)).toEqual(new Date(2026, 7, 15));
  });

  it("rolls across a year boundary", () => {
    const from = new Date(2026, 11, 20); // 20 Dec 2026
    expect(nextRentDueDate(1, from)).toEqual(new Date(2027, 0, 1));
  });

  it("ignores time of day", () => {
    const from = new Date(2026, 6, 15, 23, 59);
    expect(nextRentDueDate(15, from)).toEqual(new Date(2026, 6, 15));
  });
});

describe("daysUntil", () => {
  it("counts whole days ahead", () => {
    expect(daysUntil(new Date(2026, 6, 20), new Date(2026, 6, 10))).toBe(10);
  });

  it("is 0 for the same day regardless of time", () => {
    expect(daysUntil(new Date(2026, 6, 10, 9), new Date(2026, 6, 10, 18))).toBe(0);
  });

  it("is negative for past dates", () => {
    expect(daysUntil(new Date(2026, 6, 5), new Date(2026, 6, 10))).toBe(-5);
  });
});
