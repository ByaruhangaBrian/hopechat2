import { describe, expect, it } from "vitest";
import { isConfirmReply, isDeclineReply } from "./runtime";

describe("isConfirmReply", () => {
  it("accepts short confirmations", () => {
    for (const t of ["yes", "y", "yeah", "sure", "ok", "okay", "start", "begin", "go ahead", "take it", "lets go"]) {
      expect(isConfirmReply(t), t).toBe(true);
    }
  });

  it("accepts apostrophe variants and trailing clauses", () => {
    expect(isConfirmReply("let's go")).toBe(true);
    expect(isConfirmReply("Yes, let's do it")).toBe(true);
    expect(isConfirmReply("Ok go ahead")).toBe(true);
  });

  it("accepts confirmations with surrounding whitespace and casing", () => {
    expect(isConfirmReply("  YES  ")).toBe(true);
    expect(isConfirmReply("SURE")).toBe(true);
  });

  it("rejects empty text and unrelated chatter", () => {
    expect(isConfirmReply("")).toBe(false);
    expect(isConfirmReply("   ")).toBe(false);
    expect(isConfirmReply("what does this test cover?")).toBe(false);
    expect(isConfirmReply("how much does it cost?")).toBe(false);
  });
});

describe("isDeclineReply", () => {
  it("accepts short declines", () => {
    for (const t of ["no", "n", "nah", "not now", "no thanks", "cancel", "skip", "later", "not yet"]) {
      expect(isDeclineReply(t), t).toBe(true);
    }
  });

  it("accepts declines with surrounding whitespace and casing", () => {
    expect(isDeclineReply("  NO  ")).toBe(true);
    expect(isDeclineReply("No, maybe later")).toBe(true);
    expect(isDeclineReply("not now thanks")).toBe(true);
  });

  it("rejects empty text and unrelated chatter", () => {
    expect(isDeclineReply("")).toBe(false);
    expect(isDeclineReply("   ")).toBe(false);
    expect(isDeclineReply("what is your address?")).toBe(false);
    expect(isDeclineReply("afternoon schedule")).toBe(false);
    // Boundary safety: "no"/"n" must not match words that merely start with them.
    expect(isDeclineReply("nothing scheduled")).toBe(false);
    expect(isDeclineReply("north side")).toBe(false);
    expect(isDeclineReply("noon")).toBe(false);
    expect(isDeclineReply("station")).toBe(false);
  });
});

describe("confirm vs decline disjointness", () => {
  it("never matches both for the same string", () => {
    for (const t of ["yes", "no", "sure", "not now", "ok", "okay", "start", "skip", "take", "later"]) {
      expect(isConfirmReply(t) && isDeclineReply(t), t).toBe(false);
    }
  });
});