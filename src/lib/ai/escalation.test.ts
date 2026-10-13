import { describe, expect, it } from "vitest";
import {
  DEFAULT_ESCALATION_KEYWORDS,
  DEFAULT_ESCALATION_POLICY,
  DEFAULT_ESCALATION_TAG_NAME,
  ESCALATION_MARKER,
  detectEscalation,
  normalizeEscalationPolicy,
  recordEscalation,
  stripEscalationMarker,
  validateEscalationPolicy,
} from "./escalation";

describe("detectEscalation", () => {
  it("escalates on the [ESCALATE] marker", () => {
    const result = detectEscalation({ aiText: `Sorry. ${ESCALATION_MARKER}` });
    expect(result).toEqual({ escalated: true, reason: "ai_marker" });
  });

  it("prefers the marker over a keyword hit", () => {
    const result = detectEscalation({
      aiText: `I am escalating this. ${ESCALATION_MARKER}`,
      lastUserMessage: "I want a human",
    });
    expect(result.reason).toBe("ai_marker");
  });

  it("escalates on a default keyword", () => {
    const result = detectEscalation({ lastUserMessage: "I want to talk to a human" });
    expect(result).toEqual({ escalated: true, reason: "keyword" });
  });

  it("matches multi-word phrases", () => {
    expect(detectEscalation({ lastUserMessage: "can I talk to someone please" }).reason).toBe(
      "keyword",
    );
    expect(detectEscalation({ lastUserMessage: "I need a real person" }).reason).toBe("keyword");
  });

  it("is case-insensitive", () => {
    expect(detectEscalation({ lastUserMessage: "REFUND NOW" }).reason).toBe("keyword");
    expect(detectEscalation({ lastUserMessage: "Angry" }).reason).toBe("keyword");
  });

  it("respects word boundaries", () => {
    expect(detectEscalation({ lastUserMessage: "humanity is great" }).escalated).toBe(false);
    expect(detectEscalation({ lastUserMessage: "manage the account" }).escalated).toBe(false);
    expect(detectEscalation({ lastUserMessage: "the supermarket is open" }).escalated).toBe(false);
  });

  it("does not escalate on ordinary text", () => {
    expect(detectEscalation({ lastUserMessage: "Thanks, that works!" })).toEqual({
      escalated: false,
      reason: null,
    });
  });

  it("handles missing or empty input", () => {
    expect(detectEscalation({}).escalated).toBe(false);
    expect(detectEscalation({ aiText: null, lastUserMessage: null }).escalated).toBe(false);
    expect(detectEscalation({ lastUserMessage: "   " }).escalated).toBe(false);
  });

  it("uses a custom keyword list when provided", () => {
    const keywords = ["cancel my subscription", "speak to billing"];
    expect(detectEscalation({ lastUserMessage: "I want to speak to billing", keywords }).reason).toBe(
      "keyword",
    );
    // A default keyword no longer matches once overridden.
    expect(detectEscalation({ lastUserMessage: "I want a human", keywords }).escalated).toBe(false);
  });

  it("treats an explicit empty keyword list as keyword-matching disabled", () => {
    expect(detectEscalation({ lastUserMessage: "I want a human", keywords: [] }).escalated).toBe(
      false,
    );
    // ...but the marker still escalates.
    expect(detectEscalation({ aiText: ESCALATION_MARKER, keywords: [] }).reason).toBe("ai_marker");
  });

  it("escapes regex metacharacters in keywords", () => {
    const keywords = ["c++", "a.b"];
    expect(detectEscalation({ lastUserMessage: "help with c++ please", keywords }).reason).toBe(
      "keyword",
    );
    // "a.b" must not match "axb".
    expect(detectEscalation({ lastUserMessage: "the axb thing", keywords }).escalated).toBe(false);
  });
});

describe("stripEscalationMarker", () => {
  it("removes the marker and trims", () => {
    expect(stripEscalationMarker(`Hello there ${ESCALATION_MARKER} `)).toBe("Hello there");
    expect(stripEscalationMarker(ESCALATION_MARKER)).toBe("");
  });

  it("removes repeated markers", () => {
    expect(stripEscalationMarker(`${ESCALATION_MARKER}sorry${ESCALATION_MARKER}`)).toBe("sorry");
  });
});

describe("normalizeEscalationPolicy", () => {
  it("returns defaults for missing input", () => {
    const policy = normalizeEscalationPolicy(undefined);
    expect(policy).toEqual(DEFAULT_ESCALATION_POLICY);
    expect(policy.keywords).toEqual([...DEFAULT_ESCALATION_KEYWORDS]);
  });

  it("preserves valid custom values", () => {
    const policy = normalizeEscalationPolicy({
      enabled: false,
      autoPauseAi: false,
      keywords: ["billing"],
      tagName: "  Human needed  ",
    });
    expect(policy).toEqual({
      enabled: false,
      autoPauseAi: false,
      keywords: ["billing"],
      tagName: "Human needed",
    });
  });

  it("only treats the literal boolean true as enabled", () => {
    expect(normalizeEscalationPolicy({ enabled: "yes" }).enabled).toBe(false);
    expect(normalizeEscalationPolicy({ enabled: 1 }).autoPauseAi).toBe(true);
    expect(normalizeEscalationPolicy({ autoPauseAi: "no" }).autoPauseAi).toBe(false);
  });

  it("trims, de-duplicates and drops empty keywords", () => {
    const policy = normalizeEscalationPolicy({
      keywords: ["  Human ", "human", "", "billing", "  "],
    });
    expect(policy.keywords).toEqual(["Human", "billing"]);
  });

  it("honours an explicit empty keyword list", () => {
    expect(normalizeEscalationPolicy({ keywords: [] }).keywords).toEqual([]);
  });

  it("falls back for an invalid tag name and caps its length", () => {
    expect(normalizeEscalationPolicy({ tagName: "   " }).tagName).toBe(
      DEFAULT_ESCALATION_TAG_NAME,
    );
    expect(normalizeEscalationPolicy({ tagName: 42 }).tagName).toBe(DEFAULT_ESCALATION_TAG_NAME);
    expect(normalizeEscalationPolicy({ tagName: "x".repeat(80) }).tagName).toHaveLength(40);
  });
});

describe("validateEscalationPolicy", () => {
  it("rejects non-objects", () => {
    expect(validateEscalationPolicy(null).ok).toBe(false);
    expect(validateEscalationPolicy([]).ok).toBe(false);
    expect(validateEscalationPolicy("policy").ok).toBe(false);
  });

  it("rejects non-boolean switches", () => {
    expect(validateEscalationPolicy({ enabled: "yes" })).toMatchObject({ ok: false });
    expect(validateEscalationPolicy({ autoPauseAi: 1 }).ok).toBe(false);
  });

  it("rejects non-string keywords", () => {
    const result = validateEscalationPolicy({ keywords: ["human", 5] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/keyword/i);
  });

  it("rejects a non-array keyword list", () => {
    expect(validateEscalationPolicy({ keywords: "human" }).ok).toBe(false);
  });

  it("rejects an empty tag name", () => {
    const result = validateEscalationPolicy({ tagName: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tagName/);
  });

  it("normalizes a valid policy", () => {
    const result = validateEscalationPolicy({
      enabled: true,
      autoPauseAi: false,
      keywords: ["  Human ", "human"],
      tagName: "  Needs human  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        enabled: true,
        autoPauseAi: false,
        keywords: ["Human"],
        tagName: "Needs human",
      });
    }
  });

  it("applies defaults for an empty object", () => {
    const result = validateEscalationPolicy({});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(DEFAULT_ESCALATION_POLICY);
  });
});

interface MockCall {
  table: string;
  op: string;
  payload?: Record<string, unknown>;
  filters: Record<string, unknown>;
}

function makeDb(handlers: {
  conversation?: Record<string, unknown> | null;
  conversationError?: unknown;
  tag?: Record<string, unknown> | null;
  createdTag?: Record<string, unknown> | null;
  createdTagError?: unknown;
  updateError?: unknown;
}) {
  const calls: MockCall[] = [];

  function builder(table: string) {
    const call: MockCall = { table, op: "select", filters: {} };
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (col: string, val: unknown) => {
        call.filters[col] = val;
        return b;
      },
      order: () => b,
      limit: () => b,
      update: (payload: Record<string, unknown>) => {
        call.op = "update";
        call.payload = payload;
        return b;
      },
      insert: (payload: Record<string, unknown>) => {
        call.op = "insert";
        call.payload = payload;
        return b;
      },
      upsert: (payload: Record<string, unknown>) => {
        call.op = "upsert";
        call.payload = payload;
        return b;
      },
      single: () => {
        calls.push(call);
        if (table === "conversations") {
          return Promise.resolve({
            data: handlers.conversation ?? null,
            error: handlers.conversationError ?? null,
          });
        }
        if (table === "tags") {
          return Promise.resolve({
            data: handlers.createdTag ?? null,
            error: handlers.createdTagError ?? null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
      maybeSingle: () => {
        calls.push(call);
        if (table === "tags") {
          return Promise.resolve({ data: handlers.tag ?? null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: handlers.updateError ?? null }).then(resolve, reject),
    };
    return b;
  }

  const db = { from: (table: string) => builder(table) };
  return { db, calls };
}

const policy = DEFAULT_ESCALATION_POLICY;

function conversation(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv-1",
    escalated: false,
    contact_id: "contact-1",
    user_id: "user-1",
    unread_count: 0,
    ...overrides,
  };
}

describe("recordEscalation", () => {
  it("newly escalates: sets flags, applies the reserved tag, bumps unread", async () => {
    const { db, calls } = makeDb({ conversation: conversation() });
    const result = await recordEscalation(db as never, {
      conversationId: "conv-1",
      businessId: "biz-1",
      policy,
    });

    expect(result).toBe(true);

    const update = calls.find((c) => c.table === "conversations" && c.op === "update");
    expect(update?.payload).toMatchObject({ escalated: true, human_takeover: true, unread_count: 1 });

    const insert = calls.find((c) => c.table === "tags" && c.op === "insert");
    expect(insert?.payload).toMatchObject({
      business_id: "biz-1",
      user_id: "user-1",
      name: DEFAULT_ESCALATION_TAG_NAME,
    });

    const upsert = calls.find((c) => c.table === "contact_tags" && c.op === "upsert");
    expect(upsert?.payload).toMatchObject({ contact_id: "contact-1" });
  });

  it("is a no-op when the conversation is already escalated", async () => {
    const { db, calls } = makeDb({ conversation: conversation({ escalated: true }) });
    const result = await recordEscalation(db as never, {
      conversationId: "conv-1",
      businessId: "biz-1",
      policy,
    });

    expect(result).toBe(false);
    expect(calls.some((c) => c.op === "update")).toBe(false);
    expect(calls.some((c) => c.table === "contact_tags")).toBe(false);
  });

  it("does not pause the AI when autoPauseAi is off", async () => {
    const { db, calls } = makeDb({ conversation: conversation() });
    await recordEscalation(db as never, {
      conversationId: "conv-1",
      businessId: "biz-1",
      policy: { ...policy, autoPauseAi: false },
    });

    const update = calls.find((c) => c.table === "conversations" && c.op === "update");
    expect(update?.payload).not.toHaveProperty("human_takeover");
  });

  it("preserves an existing unread count above one", async () => {
    const { db, calls } = makeDb({ conversation: conversation({ unread_count: 3 }) });
    await recordEscalation(db as never, {
      conversationId: "conv-1",
      businessId: "biz-1",
      policy,
    });

    const update = calls.find((c) => c.table === "conversations" && c.op === "update");
    expect(update?.payload).toMatchObject({ unread_count: 3 });
  });

  it("returns false when the conversation cannot be loaded", async () => {
    const { db } = makeDb({ conversation: null });
    expect(
      await recordEscalation(db as never, {
        conversationId: "conv-1",
        businessId: "biz-1",
        policy,
      }),
    ).toBe(false);
  });

  it("reuses an existing reserved tag instead of creating a duplicate", async () => {
    const { db, calls } = makeDb({
      conversation: conversation(),
      tag: { id: "tag-9" },
    });
    await recordEscalation(db as never, {
      conversationId: "conv-1",
      businessId: "biz-1",
      policy,
    });

    expect(calls.some((c) => c.table === "tags" && c.op === "insert")).toBe(false);
    const upsert = calls.find((c) => c.table === "contact_tags" && c.op === "upsert");
    expect(upsert?.payload).toMatchObject({ tag_id: "tag-9" });
  });

  it("still escalates when there is no contact to tag", async () => {
    const { db, calls } = makeDb({ conversation: conversation({ contact_id: null }) });
    const result = await recordEscalation(db as never, {
      conversationId: "conv-1",
      businessId: "biz-1",
      policy,
    });

    expect(result).toBe(true);
    expect(calls.some((c) => c.table === "contact_tags")).toBe(false);
  });
});
