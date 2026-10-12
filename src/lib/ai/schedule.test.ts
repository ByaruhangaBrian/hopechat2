import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEZONE,
  WEEKDAYS,
  isValidTime,
  isValidTimezone,
  isWithinAiSchedule,
  normalizeAiSchedule,
  type AiSchedule,
} from "./schedule";

describe("isValidTime", () => {
  it("accepts valid 24-hour times", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("08:00")).toBe(true);
    expect(isValidTime("09:30")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
  });

  it("rejects out-of-range or malformed times", () => {
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("7:00")).toBe(false);
    expect(isValidTime("08:60")).toBe(false);
    expect(isValidTime("abc")).toBe(false);
    expect(isValidTime("")).toBe(false);
    expect(isValidTime(undefined)).toBe(false);
    expect(isValidTime(930)).toBe(false);
  });
});

describe("isValidTimezone", () => {
  it("accepts real IANA zones", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Africa/Kampala")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
  });

  it("rejects unknown or non-string zones", () => {
    expect(isValidTimezone("Not/AZone")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone(undefined)).toBe(false);
    expect(isValidTimezone(3)).toBe(false);
  });
});

describe("normalizeAiSchedule", () => {
  it("returns safe defaults for missing input", () => {
    const schedule = normalizeAiSchedule(undefined);
    expect(schedule.enabled).toBe(false);
    expect(schedule.timezone).toBe(DEFAULT_TIMEZONE);
    for (const day of WEEKDAYS) {
      expect(schedule.days[day]).toEqual({
        enabled: true,
        from: "08:00",
        to: "18:00",
      });
    }
  });

  it("falls back for an invalid timezone and malformed window", () => {
    const schedule = normalizeAiSchedule({
      enabled: true,
      timezone: "Not/AZone",
      days: { mon: { enabled: true, from: "25:00", to: "9:5" } },
    });
    expect(schedule.timezone).toBe(DEFAULT_TIMEZONE);
    expect(schedule.days.mon).toEqual({
      enabled: true,
      from: "08:00",
      to: "18:00",
    });
  });

  it("preserves valid custom values", () => {
    const schedule = normalizeAiSchedule({
      enabled: true,
      timezone: "UTC",
      days: { mon: { enabled: false, from: "09:30", to: "17:15" } },
    });
    expect(schedule.enabled).toBe(true);
    expect(schedule.timezone).toBe("UTC");
    expect(schedule.days.mon).toEqual({
      enabled: false,
      from: "09:30",
      to: "17:15",
    });
  });

  it("only treats the literal boolean true as enabled", () => {
    expect(normalizeAiSchedule({ enabled: "yes" }).enabled).toBe(false);
    expect(normalizeAiSchedule({ enabled: 1 }).enabled).toBe(false);
    expect(normalizeAiSchedule({ enabled: true }).enabled).toBe(true);
  });
});

describe("isWithinAiSchedule", () => {
  const mondayNineToFive = normalizeAiSchedule({
    enabled: true,
    timezone: "UTC",
    days: { mon: { enabled: true, from: "09:00", to: "17:00" } },
  });

  it("is always available when the master switch is off", () => {
    const off = normalizeAiSchedule({
      enabled: false,
      timezone: "UTC",
      days: { mon: { enabled: false, from: "09:00", to: "17:00" } },
    });
    // Monday 03:00 — outside every window, but master switch wins.
    expect(isWithinAiSchedule(new Date("2026-05-18T03:00:00Z"), off)).toBe(true);
  });

  it("honours from (inclusive) and to (exclusive) boundaries", () => {
    const at = (iso: string) =>
      isWithinAiSchedule(new Date(iso), mondayNineToFive);
    expect(at("2026-05-18T08:59:00Z")).toBe(false);
    expect(at("2026-05-18T09:00:00Z")).toBe(true);
    expect(at("2026-05-18T16:59:00Z")).toBe(true);
    expect(at("2026-05-18T17:00:00Z")).toBe(false);
    expect(at("2026-05-18T18:00:00Z")).toBe(false);
  });

  it("returns false on a disabled weekday", () => {
    const schedule = normalizeAiSchedule({
      enabled: true,
      timezone: "UTC",
      days: { mon: { enabled: false, from: "09:00", to: "17:00" } },
    });
    expect(isWithinAiSchedule(new Date("2026-05-18T12:00:00Z"), schedule)).toBe(
      false,
    );
  });

  it("supports overnight windows spanning midnight", () => {
    const schedule = normalizeAiSchedule({
      enabled: true,
      timezone: "UTC",
      days: { sat: { enabled: true, from: "22:00", to: "06:00" } },
    });
    const at = (iso: string) =>
      isWithinAiSchedule(new Date(iso), schedule);
    expect(at("2026-05-23T23:00:00Z")).toBe(true); // Sat evening
    expect(at("2026-05-24T05:00:00Z")).toBe(true); // Sun early, from Sat tail
    expect(at("2026-05-23T12:00:00Z")).toBe(false); // Sat midday
    expect(at("2026-05-24T07:00:00Z")).toBe(false); // Sun past the tail
  });

  it("interprets windows in the configured timezone", () => {
    const schedule = normalizeAiSchedule({
      enabled: true,
      timezone: "Africa/Kampala", // UTC+3
      days: { mon: { enabled: true, from: "08:00", to: "18:00" } },
    });
    const at = (iso: string) => isWithinAiSchedule(new Date(iso), schedule);
    expect(at("2026-05-18T04:59:00Z")).toBe(false); // 07:59 Kampala
    expect(at("2026-05-18T05:00:00Z")).toBe(true); // 08:00 Kampala
    expect(at("2026-05-18T14:59:00Z")).toBe(true); // 17:59 Kampala
    expect(at("2026-05-18T15:00:00Z")).toBe(false); // 18:00 Kampala
  });

  it("treats from === to as a full-day window", () => {
    const schedule = normalizeAiSchedule({
      enabled: true,
      timezone: "UTC",
      days: { mon: { enabled: true, from: "00:00", to: "00:00" } },
    });
    expect(isWithinAiSchedule(new Date("2026-05-18T03:00:00Z"), schedule)).toBe(
      true,
    );
    expect(isWithinAiSchedule(new Date("2026-05-18T13:00:00Z"), schedule)).toBe(
      true,
    );
  });

  it("fails open on an unparseable timezone", () => {
    const broken = {
      enabled: true,
      timezone: "Not/AZone",
      days: normalizeAiSchedule({}).days,
    } as AiSchedule;
    expect(isWithinAiSchedule(new Date("2026-05-18T03:00:00Z"), broken)).toBe(
      true,
    );
  });
});
