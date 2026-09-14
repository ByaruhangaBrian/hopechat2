"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  Plus,
  X,
  Save,
  Sparkles,
  ChevronRight,
  MousePointerClick,
  Link2,
  Type,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slug(label: string): string {
  const s = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || "question";
}

const SEP = "\u0001";
const TEXT = "*"; // placeholder for the (non-routing) typed answer in mapping keys
const comboKey = (a: string, b: string) => `${a}${SEP}${b}`;

type Q1Type = "text" | "choice";

type ScreeningTest = {
  id: string;
  title: string;
  is_entry?: boolean;
  is_active?: boolean;
  intro_fields?: any[];
  route_rules?: Record<string, string> | null;
};

/* Flow canvas layout constants */
const NODE = {
  q1: { w: 150, h: 56 },
  combo: { w: 190, h: 56 },
  test: { w: 210, h: 74 },
};
const COL_X = { q1: 20, combo: 310, test: 640 };

type Pos = { x: number; y: number };

/* ------------------------------------------------------------------ */
/*  Screening flow canvas                                              */
/* ------------------------------------------------------------------ */

function FlowCanvas({
  q1Type,
  q1Label,
  q1Options,
  q2Options,
  mapping,
  targets,
  onPickCombo,
}: {
  q1Type: Q1Type;
  q1Label: string;
  q1Options: string[];
  q2Options: string[];
  mapping: Record<string, string>;
  targets: ScreeningTest[];
  onPickCombo: (a: string, b: string, testId: string) => void;
}) {
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const posRef = useRef<Record<string, Pos>>({});
  const dragRef = useRef<{ id: string; dx: number; dy: number; startX: number; startY: number; moved: boolean } | null>(null);

  posRef.current = positions;

  const q1 = q1Options.map((o) => o.trim()).filter(Boolean);
  const q2 = q2Options.map((o) => o.trim()).filter(Boolean);
  const isChoice = q1Type === "choice";

  const combos: Array<{ a: string; b: string; key: string }> = isChoice
    ? q1.flatMap((a) => q2.map((b) => ({ a, b, key: comboKey(a, b) })))
    : q2.map((b) => ({ a: TEXT, b, key: comboKey(TEXT, b) }));
  const q1NodeId = isChoice ? (a: string) => `a-${a}` : () => "a-note";

  /* Build a deterministic default layout, filling in only missing nodes. */
  useEffect(() => {
    if (q2.length === 0) return;
    setPositions((prev) => {
      const next = { ...prev };
      const needs = (id: string) => !next[id];
      const yOf = (i: number) => 24 + i * 76;
      if (isChoice) {
        q1.forEach((a, i) => {
          if (needs(q1NodeId(a))) next[q1NodeId(a)] = { x: COL_X.q1, y: yOf(i) };
        });
      } else if (needs("a-note")) {
        next["a-note"] = { x: COL_X.q1, y: 24 };
      }
      combos.forEach((c) => {
        if (needs(c.key)) {
          const anchor = isChoice ? q1.indexOf(c.a) : 0;
          const y = yOf(anchor) + q2.indexOf(c.b) * 68;
          next[c.key] = { x: COL_X.combo, y };
        }
      });
      const comboYs = combos.map((c) => next[c.key]?.y ?? 0);
      let fallbackY = (comboYs.length ? Math.max(...comboYs) : 24) + 90;
      for (const t of targets) {
        const ys: number[] = [];
        combos.forEach((c) => {
          if (mapping[c.key] === t.id) ys.push((next[c.key]?.y ?? 0) + NODE.combo.h / 2);
        });
        if (needs(`test-${t.id}`)) {
          const y = ys.length > 0 ? ys.reduce((s, v) => s + v, 0) / ys.length - NODE.test.h / 2 : fallbackY;
          next[`test-${t.id}`] = { x: COL_X.test, y };
          if (ys.length === 0) fallbackY += NODE.test.h + 20;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChoice, q1.join(","), q2.join(","), mapping, targets.length]);

  function onPointerDown(e: React.PointerEvent, id: string) {
    const p = posRef.current[id];
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id, dx: e.clientX - p.x, dy: e.clientY - p.y, startX: e.clientX, startY: e.clientY, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && (Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4)) d.moved = true;
    if (!d.moved) return;
    setPositions((prev) => ({ ...prev, [d.id]: { x: e.clientX - d.dx, y: e.clientY - d.dy } }));
  }

  function onPointerUp(e: React.PointerEvent, id: string) {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved) setSelected((s) => (s === id ? null : id));
  }

  const bounds = Object.entries(positions).reduce(
    (b, [id, p]) => {
      const size = id.startsWith("test-") ? NODE.test : id.startsWith("a-") ? NODE.q1 : NODE.combo;
      return {
        w: Math.max(b.w, p.x + size.w),
        h: Math.max(b.h, p.y + size.h),
        minX: Math.min(b.minX, p.x),
        minY: Math.min(b.minY, p.y),
      };
    },
    { w: 0, h: 0, minX: 0, minY: 0 },
  );
  const pad = 40;
  const canvasW = Math.max(bounds.w, COL_X.test + NODE.test.w) + pad;
  const canvasH = Math.max(bounds.h, 240) + pad;
  const ox = pad / 2 - bounds.minX;
  const oy = pad / 2 - bounds.minY;

  const curve = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.max(28, (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const mid = (id: string, size: { w: number; h: number }) =>
    positions[id] ? { x: positions[id].x, y: positions[id].y + size.h / 2 } : null;

  const edges: Array<{ d: string; color: string }> = [];
  const addEdge = (srcId: string, srcSize: { w: number; h: number }, tgtId: string, tgtSize: { w: number; h: number }, color: string) => {
    const s = mid(srcId, srcSize);
    const t = mid(tgtId, tgtSize);
    if (!s || !t) return;
    edges.push({ d: curve(s.x + srcSize.w, s.y, t.x, t.y), color });
  };

  // Q1 (answers or typed-note) => its combos
  for (const c of combos) {
    const srcId = q1NodeId(c.a);
    addEdge(srcId, NODE.q1, c.key, NODE.combo, "#cbd5e1");
  }
  // combo => target test
  for (const c of combos) {
    const testId = mapping[c.key];
    if (testId) addEdge(c.key, NODE.combo, `test-${testId}`, NODE.test, "#10b981");
  }

  const testById = new Map(targets.map((t) => [t.id, t]));

  const headerWrap = (text: string) => (
    <div className="absolute rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground" style={{ left: -6, top: -20 }}>
      {text}
    </div>
  );

  return (
    <div className="relative overflow-auto rounded-lg border border-border bg-muted/40">
      <div className="relative" style={{ width: canvasW, height: canvasH }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={canvasW}
          height={canvasH}
          style={{ transform: `translate(${ox}px, ${oy}px)` }}
        >
          {edges.map((e, i) => (
            <path key={i} d={e.d} fill="none" stroke={e.color} strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
          ))}
        </svg>

        {/* Column headers */}
        {q2.length > 0 && (
          <div className="absolute" style={{ left: ox + COL_X.q1 - 16, top: oy + 2 }}>
            {headerWrap(isChoice ? "Answers 1" : "Typed answer")}
          </div>
        )}
        {q2.length > 0 && (
          <div className="absolute" style={{ left: ox + COL_X.combo - 16, top: oy + 2 }}>
            {headerWrap("Question 2 answer")}
          </div>
        )}
        <div className="absolute" style={{ left: ox + COL_X.test - 16, top: oy + 2 }}>
          {headerWrap("Test")}
        </div>

        {/* Q1: multiple-choice answers OR a typed-answer note */}
        {isChoice
          ? q1.map((a) => {
              const p = positions[q1NodeId(a)];
              if (!p) return null;
              return (
                <div
                  key={a}
                  className="absolute cursor-grab select-none rounded-lg border border-primary/40 bg-card px-3 py-2 shadow-sm active:cursor-grabbing"
                  style={{ left: ox + p.x, top: oy + p.y, width: NODE.q1.w, height: NODE.q1.h }}
                  onPointerDown={(e) => onPointerDown(e, q1NodeId(a))}
                  onPointerMove={onPointerMove}
                  onPointerUp={(e) => onPointerUp(e, q1NodeId(a))}
                >
                  <div className="text-xs font-semibold text-foreground">{a}</div>
                  <div className="text-[10px] text-muted-foreground">click-drag to move</div>
                </div>
              );
            })
          : (() => {
              const p = positions["a-note"];
              if (!p) return null;
              return (
                <div
                  key="a-note"
                  className="absolute w-[180px] cursor-default select-none rounded-lg border border-dashed border-muted-foreground/40 bg-card px-3 py-2 shadow-sm"
                  style={{ left: ox + p.x, top: oy + p.y, height: NODE.q1.h }}
                >
                  <div className="line-clamp-2 text-xs font-semibold text-foreground">{q1Label}</div>
                  <div className="text-[10px] text-muted-foreground">student types this</div>
                </div>
              );
            })()}

        {/* Combo / Q2 answer nodes */}
        {combos.map((c) => {
          const p = positions[c.key];
          if (!p) return null;
          const mapped = !!mapping[c.key];
          return (
            <div
              key={c.key}
              className={cn(
                "absolute select-none rounded-lg border px-3 py-2 shadow-sm",
                "cursor-pointer transition-colors",
                mapped ? "border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-dashed border-border bg-card hover:bg-accent/40",
                selected === c.key && "ring-2 ring-primary/60",
              )}
              style={{ left: ox + p.x, top: oy + p.y, width: NODE.combo.w, height: NODE.combo.h }}
              onPointerDown={(e) => onPointerDown(e, c.key)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, c.key)}
            >
              <div className="flex items-center justify-between gap-1 text-xs">
                <span className="truncate font-medium text-foreground">{c.b}</span>
                {mapped ? (
                  <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                ) : (
                  <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                )}
              </div>
              <div className="mt-1 truncate text-[10px] text-muted-foreground">
                {isChoice ? `${c.a} · ` : ""}
                {mapped ? testById.get(mapping[c.key])?.title ?? "Test" : "Tap to choose a test"}
              </div>
            </div>
          );
        })}

        {/* Test nodes */}
        {targets.map((t) => {
          const p = positions[`test-${t.id}`];
          if (!p) return null;
          const routed = Object.values(mapping).includes(t.id);
          return (
            <div
              key={t.id}
              className={cn(
                "absolute cursor-grab select-none rounded-lg border px-3 py-2 shadow-sm active:cursor-grabbing",
                routed ? "border-primary/50 bg-card" : "border-border bg-card/60",
              )}
              style={{ left: ox + p.x, top: oy + p.y, width: NODE.test.w, height: NODE.test.h }}
              onPointerDown={(e) => onPointerDown(e, `test-${t.id}`)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, `test-${t.id}`)}
            >
              <div className="truncate text-xs font-semibold text-foreground">{t.title}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {routed ? `Routes ${Object.values(mapping).filter((v) => v === t.id).length} combination(s) here` : "No routing yet"}
              </div>
            </div>
          );
        })}

        {/* Target picker popover for selected combo */}
        {selected &&
          (() => {
            const [a, b] = selected.split(SEP);
            const p = positions[selected];
            if (!p) return null;
            const choose = (testId: string) => {
              onPickCombo(a, b, testId);
              setSelected(null);
            };
            return (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSelected(null)} />
                <div
                  className="absolute z-40 w-56 rounded-lg border border-border bg-card p-2 shadow-xl"
                  style={{ left: ox + p.x + NODE.combo.w + 12, top: oy + p.y }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-1 px-1 text-[11px] font-semibold text-foreground">
                    {isChoice ? `${a} · ` : ""}
                    {b}
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "block w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                      mapping[selected] ? "" : "bg-muted font-medium",
                    )}
                    onClick={() => choose("")}
                  >
                    — none (no test) —
                  </button>
                  {targets.length === 0 && (
                    <p className="px-1 py-1 text-[10px] text-muted-foreground">
                      Create tests first under Tests &amp; Practice.
                    </p>
                  )}
                  {targets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={cn(
                        "block w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                        mapping[selected] === t.id && "bg-primary/10 font-medium text-primary",
                      )}
                      onClick={() => choose(t.id)}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screening setup screen                                             */
/* ------------------------------------------------------------------ */

export function ScreeningSetupScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const [tests, setTests] = useState<ScreeningTest[]>([]);

  const [q1Type, setQ1Type] = useState<Q1Type>("choice");
  const [q1Label, setQ1Label] = useState("Which class?");
  const [q1Options, setQ1Options] = useState<string[]>(["Class 6", "Class 7", "Class 8"]);
  const [q2Label, setQ2Label] = useState("Which subject?");
  const [q2Options, setQ2Options] = useState<string[]>(["Maths", "Science", "English"]);

  const [optInput, setOptInput] = useState("");
  const [addingTo, setAddingTo] = useState<1 | 2>(1);

  const [mapping, setMapping] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tests", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load tests");
      const data = await res.json();
      const all: ScreeningTest[] = data.tests ?? [];
      setTests(all);

      const entry = all.find((t) => t.is_entry === true) ?? null;
      if (entry) {
        const f0 = entry.intro_fields?.[0];
        const f1 = entry.intro_fields?.[1];
        if (f0) {
          setQ1Type(f0.type === "text" ? "text" : "choice");
          setQ1Label(f0.label || "Which class?");
          setQ1Options(Array.isArray(f0.options) ? f0.options.filter(Boolean) : []);
        }
        if (f1) {
          setQ2Label(f1.label || "Which subject?");
          setQ2Options(Array.isArray(f1.options) ? f1.options.filter(Boolean) : []);
        }
        const key0 = f0?.key;
        const key1 = f1?.key;
        const isChoice = f0?.type !== "text";
        if ((isChoice && key0 && key1) || (!isChoice && key1)) {
          const m: Record<string, string> = {};
          for (const t of all) {
            if (t.is_entry) continue;
            const rules = t.route_rules || {};
            if (!rules[key1]) continue;
            if (isChoice && rules[key0]) m[comboKey(rules[key0], rules[key1])] = t.id;
            if (!isChoice && Object.keys(rules).every((k) => k === key1)) m[comboKey(TEXT, rules[key1])] = t.id;
          }
          setMapping(m);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q1 = q1Options.map((o) => o.trim()).filter(Boolean);
  const q2 = q2Options.map((o) => o.trim()).filter(Boolean);
  const isChoice = q1Type === "choice";

  const targets = tests
    .filter((t) => !t.is_entry)
    .sort((a, b) => a.title.localeCompare(b.title));

  function addOption(v: string) {
    if (!v) return;
    const arr = addingTo === 1 ? q1Options : q2Options;
    if (arr.map((o) => o.trim().toLowerCase()).includes(v.toLowerCase())) {
      toast.error("That answer already exists");
      return;
    }
    if (addingTo === 1) setQ1Options((p) => [...p, v]);
    else setQ2Options((p) => [...p, v]);
    setOptInput("");
  }

  function removeOption(idx: number) {
    if (addingTo === 1) {
      const removed = q1Options[idx];
      setQ1Options((p) => p.filter((_, i) => i !== idx));
      if (removed) dropComboContaining(removed, true);
    } else {
      const removed = q2Options[idx];
      setQ2Options((p) => p.filter((_, i) => i !== idx));
      if (removed) dropComboContaining(removed, false);
    }
  }

  function dropComboContaining(option: string, isQ1: boolean) {
    setMapping((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const [a, b] = key.split(SEP);
        if (isQ1 ? a === option : b === option) delete next[key];
      }
      return next;
    });
  }

  function switchQ1Type(next: Q1Type) {
    if (next === q1Type) return;
    setQ1Type(next);
    setMapping({});
    setSavedOk(false);
    toast(isChoice ? "Switched to text — tap combinations to re-route them." : "Switched to multiple choice — tap combinations to re-route them.");
  }

  function pickCombo(a: string, b: string, testId: string) {
    const key = comboKey(a, b);
    if (!testId) {
      setMapping((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    const alreadyUsed = Object.entries(mapping).find(([k, v]) => v === testId && k !== key);
    if (alreadyUsed) {
      toast.error("That test is already routed from another combination");
      return;
    }
    setMapping((prev) => ({ ...prev, [key]: testId }));
  }

  async function save() {
    if (!q1Label.trim() || !q2Label.trim()) return toast.error("Give both questions a name");
    if (isChoice && q1.length === 0) return toast.error("Add at least one answer to the first question");
    if (q2.length === 0) return toast.error("Add at least one answer to the second question");
    if (isChoice && q1.length > 10) return toast.error("Max 10 answers per question (WhatsApp button limit)");
    if (q2.length > 10) return toast.error("Max 10 answers per question (WhatsApp button limit)");

    const key1 = slug(q1Label);
    const key2 = slug(q2Label);
    const introFields = [
      { key: key1, label: q1Label.trim(), type: q1Type, options: isChoice ? q1 : [] },
      { key: key2, label: q2Label.trim(), type: "choice", options: q2 },
    ];
    const previousMapping = { ...mapping };

    setSaving(true);
    setSavedOk(false);
    try {
      let entry = tests.find((t) => t.is_entry === true) ?? null;
      if (!entry) {
        const res = await fetch("/api/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Entry Screening",
            mode: "practice",
            is_active: true,
            is_entry: true,
            intro_fields: introFields,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create the screening test");
        entry = data.test;
        setTests((p) => [data.test, ...p]);
      } else {
        const res = await fetch(`/api/tests/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intro_fields: introFields, is_entry: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update the screening test");
      }

      const newIds = new Set<string>();
      for (const [key, testId] of Object.entries(mapping)) {
        const [a, b] = key.split(SEP);
        if (!q2.includes(b)) continue;
        if (isChoice && !q1.includes(a)) continue;
        newIds.add(testId);
        const route_rules = isChoice ? { [key1]: a, [key2]: b } : { [key2]: b };
        const res = await fetch(`/api/tests/${testId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ route_rules }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`Failed to save routing for "${b}": ${data.error || ""}`);
      }

      for (const [key, testId] of Object.entries(previousMapping)) {
        if (!testId || newIds.has(testId)) continue;
        const t = tests.find((x) => x.id === testId);
        const rules = t?.route_rules || {};
        const keys = Object.keys(rules);
        const allowed = isChoice ? [key1, key2] : [key2];
        if (keys.length > 0 && keys.every((k) => allowed.includes(k))) {
          const res = await fetch(`/api/tests/${testId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ route_rules: null }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            toast.error(`Could not clear stale routing on "${t?.title}": ${data.error || ""}`);
          }
        }
      }

      setSavedOk(true);
      toast.success("Screening saved — students now route straight to the right test");
    } catch (err: any) {
      toast.error(err.message || "Failed to save screening");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const optionEditor = (placeholder: string) => (
    <div className="flex gap-2">
      <Input
        value={optInput}
        placeholder={placeholder}
        className="h-8 flex-1 text-sm"
        onChange={(e) => {
          setOptInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addOption(optInput.trim());
          }
        }}
      />
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => addOption(optInput.trim())}>
        <Plus className="size-3" /> Add
      </Button>
    </div>
  );

  const chips = (options: string[]) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-foreground">
          {opt}
          <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removeOption(i)} aria-label={`Remove ${opt}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      {options.length === 0 && <span className="text-xs text-muted-foreground">No answers yet — add some above.</span>}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" /> Screening setup
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask every student up to 2 questions, then route each answer to the right test.
        </p>
      </div>

      {/* Step 1 — questions & answers */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">1. Your two questions</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">First question</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => switchQ1Type("text")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  !isChoice ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Type className="size-3.5" /> Typed answer
              </button>
              <button
                type="button"
                onClick={() => switchQ1Type("choice")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isChoice ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <ListChecks className="size-3.5" /> Multiple choice
              </button>
            </div>
            <Input value={q1Label} onChange={(e) => setQ1Label(e.target.value)} placeholder="e.g. Which class?" className="h-8 text-sm" />
            {isChoice ? (
              <div className="space-y-2">
                <div
                  onClick={() => {
                    setAddingTo(1);
                  }}
                >
                  {optionEditor("Add an answer, e.g. Class 6")}
                </div>
                {chips(q1Options)}
                <p className="text-[11px] italic text-muted-foreground">Student taps one of these buttons.</p>
              </div>
            ) : (
              <p className="text-[11px] italic text-muted-foreground">
                Student types their answer — it&apos;s recorded but the routing is decided by the second question.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Second question</label>
            <Input value={q2Label} onChange={(e) => setQ2Label(e.target.value)} placeholder="e.g. Which subject?" className="h-8 text-sm" />
            <div
              onClick={() => {
                setAddingTo(2);
              }}
            >
              {optionEditor("Add an answer, e.g. Maths")}
            </div>
            {chips(q2Options)}
            <p className="text-[11px] italic text-muted-foreground">
              Student taps one of these buttons — each routes to a test.
            </p>
          </div>
        </div>
      </div>

      {/* Step 2 — the flow canvas */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">2. Route answers to tests</h2>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Link2 className="size-3 text-emerald-500" /> green line = routing</span>
            <span className="inline-flex items-center gap-1"><MousePointerClick className="size-3" /> tap a combination to set its test</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag boxes around to arrange them — the connectors bend to follow.
        </p>

        {q2.length === 0 || (isChoice && q1.length === 0) ? (
          <p className="mt-4 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {isChoice
              ? "Add at least one answer to each question above to draw the flow."
              : "Add at least one answer to the second question above to draw the flow."}
          </p>
        ) : (
          <div className="mt-4">
            <FlowCanvas
              q1Type={q1Type}
              q1Label={q1Label}
              q1Options={q1}
              q2Options={q2}
              mapping={mapping}
              targets={targets}
              onPickCombo={pickCombo}
            />
          </div>
        )}

        {targets.length === 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            No tests to route to yet — create your subject tests under the Tests &amp; Practice tab first.
          </p>
        )}
      </div>

      {/* Step 3 — finish */}
      <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h2 className="text-sm font-semibold">3. Turn it on</h2>
        <p className="text-xs text-muted-foreground">
          In Automations, add the step <span className="font-semibold text-foreground">Dispatch Test / Practice</span> and choose{" "}
          <span className="font-semibold text-foreground">Entry Screening</span>. When a student texts, they answer your
          question(s) and go straight into the mapped test.
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] italic text-muted-foreground">
            {savedOk ? "Saved — routing is live." : "Students whose answer has no test will be asked to start over."}
          </p>
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save screening
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}