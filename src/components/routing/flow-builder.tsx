"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Route,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FlowMeta = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  entry_step_id: string | null;
  step_count: number;
};

type FlowStepRow = {
  id: string;
  key: string;
  prompt: string;
  step_type: "choice" | "text";
  options: { label: string; next_step_id: string | null; test_id: string | null }[];
  next_step_id: string | null;
  test_id: string | null;
  position: number;
};

/** Builder-local representation of a step. */
type DraftStep = {
  id: string;
  key: string;
  prompt: string;
  step_type: "choice" | "text";
  /** Target selector value: "" | "step:<id>" | "test:<id>" */
  options: { label: string; target: string }[];
  /** Target selector value for text steps. */
  target: string;
};

type FlowDetail = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  entry_step_id: string | null;
  steps: DraftStep[];
};

function stepToDraft(s: FlowStepRow): DraftStep {
  const options = (s.options ?? []).map((o) => ({
    label: o.label,
    target: o.next_step_id ? `step:${o.next_step_id}` : o.test_id ? `test:${o.test_id}` : "",
  }));
  return {
    id: s.id,
    key: s.key,
    prompt: s.prompt,
    step_type: s.step_type,
    options,
    target: s.next_step_id ? `step:${s.next_step_id}` : s.test_id ? `test:${s.test_id}` : "",
  };
}

function draftToRow(s: DraftStep, position: number) {
  const parseTarget = (t: string) => {
    if (!t) return { next_step_id: null, test_id: null };
    if (t.startsWith("step:")) return { next_step_id: t.slice(5), test_id: null };
    if (t.startsWith("test:")) return { next_step_id: null, test_id: t.slice(5) };
    return { next_step_id: null, test_id: null };
  };
  const own = parseTarget(s.target);
  return {
    id: s.id,
    key: s.key,
    prompt: s.prompt,
    step_type: s.step_type,
    options: s.options.map((o) => ({ label: o.label, ...parseTarget(o.target) })),
    next_step_id: own.next_step_id,
    test_id: own.test_id,
    position,
  };
}

function newStep(step_type: "choice" | "text"): DraftStep {
  return {
    id: crypto.randomUUID(),
    key: "",
    prompt: "",
    step_type,
    options: [
      { label: "", target: "" },
      { label: "", target: "" },
    ],
    target: "",
  };
}

/* ------------------------------------------------------------------ */
/*  Root component                                                     */
/* ------------------------------------------------------------------ */

export function FlowBuilderScreen() {
  const [flows, setFlows] = useState<FlowMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<FlowDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tests, setTests] = useState<Array<{ id: string; title: string }>>([]);

  // Create flow dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [flowToDelete, setFlowToDelete] = useState<FlowMeta | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Load list ---- */
  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routing-flows", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setFlows(data.flows ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
    const onFocus = () => fetchFlows();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchFlows]);

  /* ---- Load tests (for target picker) ---- */
  useEffect(() => {
    fetch("/api/tests", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setTests(Array.isArray(data.tests) ? data.tests : []))
      .catch(() => setTests([]));
  }, []);

  /* ---- Open designer for a flow ---- */
  const openDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/routing-flows/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const f = data.flow;
        const steps = (f.steps ?? []).map((s: any) => stepToDraft(s));
        setDetail({
          id: f.id,
          name: f.name,
          description: f.description ?? null,
          is_active: f.is_active === true,
          entry_step_id: f.entry_step_id ?? null,
          steps,
        });
      } else {
        toast.error("Could not load flow");
      }
    } catch {
      toast.error("Could not load flow");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /* ---- Flows list actions ---- */
  function openCreate() {
    setNewName("");
    setNewDescription("");
    setCreateOpen(true);
  }

  async function createFlow() {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/routing-flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create flow");
      setCreateOpen(false);
      setFlows((prev) => {
        const rest = prev.filter((f) => f.id !== data.flow.id);
        return [{ ...data.flow, step_count: data.flow.step_count ?? 0 }, ...rest];
      });
      await fetchFlows();
      await openDetail(data.flow.id);
      toast.success("Flow created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create flow");
    } finally {
      setCreating(false);
    }
  }

  async function confirmDeleteFlow() {
    if (!flowToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/routing-flows/${flowToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete flow");
      setFlowToDelete(null);
      setDetail(null);
      await fetchFlows();
      toast.success("Flow deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete flow");
    } finally {
      setDeleting(false);
    }
  }

  /* ---- Draft updates ---- */
  function updateStep(id: string, patch: Partial<DraftStep>) {
    setDetail((d) => {
      if (!d) return d;
      return { ...d, steps: d.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
    });
  }

  function updateOption(stepId: string, index: number, label: string) {
    setDetail((d) => {
      if (!d) return d;
      return {
        ...d,
        steps: d.steps.map((s) =>
          s.id === stepId
            ? { ...s, options: s.options.map((o, i) => (i === index ? { ...o, label } : o)) }
            : s
        ),
      };
    });
  }

  function updateOptionTarget(stepId: string, index: number, target: string) {
    setDetail((d) => {
      if (!d) return d;
      return {
        ...d,
        steps: d.steps.map((s) =>
          s.id === stepId
            ? { ...s, options: s.options.map((o, i) => (i === index ? { ...o, target } : o)) }
            : s
        ),
      };
    });
  }

  function addOption(stepId: string) {
    setDetail((d) => {
      if (!d) return d;
      return {
        ...d,
        steps: d.steps.map((s) =>
          s.id === stepId && s.options.length < 10
            ? { ...s, options: [...s.options, { label: "", target: "" }] }
            : s
        ),
      };
    });
  }

  function removeOption(stepId: string, index: number) {
    setDetail((d) => {
      if (!d) return d;
      return {
        ...d,
        steps: d.steps.map((s) =>
          s.id === stepId
            ? { ...s, options: s.options.filter((_, i) => i !== index) }
            : s
        ),
      };
    });
  }

  function addStep(step_type: "choice" | "text") {
    setDetail((d) => {
      if (!d) return d;
      return { ...d, steps: [...d.steps, newStep(step_type)] };
    });
  }

  function deleteStep(id: string) {
    setDetail((d) => {
      if (!d) return d;
      const steps = d.steps.filter((s) => s.id !== id);
      return { ...d, steps, entry_step_id: d.entry_step_id === id ? null : d.entry_step_id };
    });
  }

  function moveStep(id: string, dir: -1 | 1) {
    setDetail((d) => {
      if (!d) return d;
      const idx = d.steps.findIndex((s) => s.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= d.steps.length) return d;
      const steps = [...d.steps];
      const [moved] = steps.splice(idx, 1);
      steps.splice(to, 0, moved);
      return { ...d, steps };
    });
  }

  /* ---- Save ---- */
  async function saveDesign() {
    if (!detail) return;
    if (detail.steps.length === 0) {
      toast.error("Add at least one step before saving");
      return;
    }
    for (const s of detail.steps) {
      if (!s.key.trim()) {
        toast.error("Every step needs a name");
        return;
      }
      if (!s.prompt.trim()) {
        toast.error(`Step "${s.key}" needs a prompt`);
        return;
      }
      if (s.step_type === "choice") {
        if (s.options.some((o) => !o.label.trim())) {
          toast.error(`Step "${s.key}" has an option without a label`);
          return;
        }
      } else if (!s.target) {
        toast.error(`Step "${s.key}" needs a continuation target`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        entry_step_id: detail.entry_step_id,
        deleted_step_ids: [],
        steps: detail.steps.map((s, i) => draftToRow(s, i)),
      };
      const res = await fetch(`/api/routing-flows/${detail.id}/steps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save flow");
      const f = data.flow;
      setDetail({
        id: f.id,
        name: f.name,
        description: f.description ?? null,
        is_active: f.is_active === true,
        entry_step_id: f.entry_step_id ?? null,
        steps: (f.steps ?? []).map((s: any) => stepToDraft(s)),
      });
      setFlows((prev) =>
        prev.map((fl) => ({
          ...fl,
          name: f.name ?? fl.name,
          description: f.description ?? fl.description,
          is_active: f.is_active === true,
          step_count: (f.steps ?? []).length,
        }))
      );
      await fetchFlows();
      toast.success("Flow saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save flow");
    } finally {
      setSaving(false);
    }
  }

  /* ---- Metadata save ---- */
  async function saveMeta() {
    if (!detail) return;
    if (!detail.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/routing-flows/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: detail.name.trim(),
          description: detail.description?.trim() || null,
          is_active: detail.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save flow");
      await fetchFlows();
      toast.success("Flow updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update flow");
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Routing Flows</h1>
        <p className="text-sm text-muted-foreground">
          Build a multi-level screening (class → subject → paper…) that routes each customer to the right test on WhatsApp.
        </p>
      </div>

      {!detail ? (
        /* ---------------- Flows list ---------------- */
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Your flows</CardTitle>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> New flow
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : flows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No flows yet. Create one, add steps, then dispatch it from an automation.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {flows.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => openDetail(f.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Route className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{f.name}</span>
                          {!f.is_active && <Badge variant="secondary">Paused</Badge>}
                        </div>
                        {f.description && (
                          <p className="truncate text-xs text-muted-foreground">{f.description}</p>
                        )}
                      </div>
                      <Badge variant="outline">{f.step_count} steps</Badge>
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => setFlowToDelete(f)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ---------------- Flow designer ---------------- */
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
              ← Back
            </Button>
            <Input
              className="max-w-xs"
              value={detail.name}
              onChange={(e) => setDetail({ ...detail, name: e.target.value })}
              placeholder="Flow name"
            />
            <Textarea
              className="max-w-md"
              value={detail.description ?? ""}
              onChange={(e) => setDetail({ ...detail, description: e.target.value })}
              placeholder="Description (optional)"
              rows={1}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active</span>
              <Switch
                checked={detail.is_active}
                onCheckedChange={(v) => setDetail({ ...detail, is_active: v })}
              />
            </div>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={saveMeta} disabled={saving || detailLoading}>
              <Save className="mr-1 h-4 w-4" /> Save info
            </Button>
            <Button size="sm" onClick={saveDesign} disabled={saving || detailLoading}>
              <Save className="mr-1 h-4 w-4" /> Save design
            </Button>
          </div>

          {detailLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Entry step */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Entry step</CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={detail.entry_step_id ?? ""}
                    onChange={(e) => setDetail({ ...detail, entry_step_id: e.target.value || null })}
                    className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm text-foreground"
                  >
                    <option value="">Select which step the flow starts with…</option>
                    {detail.steps.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.key.trim() || "(unnamed step)"}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The customer is asked this first. Everything else is reached through option targets.
                  </p>
                </CardContent>
              </Card>

              {/* Steps */}
              <div className="flex flex-col gap-3">
                {detail.steps.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      No steps yet — add your first question below.
                    </CardContent>
                  </Card>
                )}
                {detail.steps.map((s, idx) => (
                  <StepCard
                    key={s.id}
                    step={s}
                    index={idx}
                    total={detail.steps.length}
                    steps={detail.steps}
                    tests={tests}
                    onChange={(patch) => updateStep(s.id, patch)}
                    onDelete={() => deleteStep(s.id)}
                    onMove={(dir) => moveStep(s.id, dir)}
                    onOptionLabel={(i, label) => updateOption(s.id, i, label)}
                    onOptionTarget={(i, target) => updateOptionTarget(s.id, i, target)}
                    onAddOption={() => addOption(s.id)}
                    onRemoveOption={(i) => removeOption(s.id, i)}
                  />
                ))}
              </div>

              {/* Add step */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => addStep("choice")}>
                  <Plus className="mr-1 h-4 w-4" /> Choice step
                </Button>
                <Button variant="outline" onClick={() => addStep("text")}>
                  <Plus className="mr-1 h-4 w-4" /> Text step
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create routing flow</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Name *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Class screening" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Description</label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createFlow} disabled={creating}>
              {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!flowToDelete} onOpenChange={(v) => !v && setFlowToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete flow?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            “{flowToDelete?.name}” and all its steps will be permanently removed. Automations referencing it will stop working.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFlowToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteFlow} disabled={deleting}>
              {deleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step card                                                          */
/* ------------------------------------------------------------------ */

type TargetPickerProps = {
  value: string;
  onChange: (v: string) => void;
  steps: DraftStep[];
  tests: Array<{ id: string; title: string }>;
  excludeStepId?: string;
};

function TargetPicker({ value, onChange, steps, tests, excludeStepId }: TargetPickerProps) {
  const stepTargets = steps.filter((s) => s.id !== excludeStepId);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm text-foreground"
    >
      <option value="">End flow — hand to human</option>
      {stepTargets.length > 0 && (
        <optgroup label="Next step">
          {stepTargets.map((s) => (
            <option key={s.id} value={`step:${s.id}`}>
              {s.key.trim() || "(unnamed step)"}
            </option>
          ))}
        </optgroup>
      )}
      {tests.length > 0 && (
        <optgroup label="Test / Practice">
          {tests.map((t) => (
            <option key={t.id} value={`test:${t.id}`}>
              {t.title}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

function StepCard(props: {
  step: DraftStep;
  index: number;
  total: number;
  steps: DraftStep[];
  tests: Array<{ id: string; title: string }>;
  onChange: (patch: Partial<DraftStep>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onOptionLabel: (i: number, label: string) => void;
  onOptionTarget: (i: number, target: string) => void;
  onAddOption: () => void;
  onRemoveOption: (i: number) => void;
}) {
  const { step, index, total } = props;
  const typeBadge =
    step.step_type === "choice" ? (
      <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15">Choice</Badge>
    ) : (
      <Badge variant="secondary">Text</Badge>
    );

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
          {typeBadge}
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => props.onMove(-1)} disabled={index === 0}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => props.onMove(1)}
            disabled={index === total - 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={props.onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Name (internal)</label>
            <Input
              value={step.key}
              onChange={(e) => props.onChange({ key: e.target.value })}
              placeholder="e.g. Which class?"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => props.onChange({ step_type: "choice" })}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  step.step_type === "choice"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                    : "border-input bg-background text-muted-foreground"
                }`}
              >
                Choice (buttons)
              </button>
              <button
                type="button"
                onClick={() => props.onChange({ step_type: "text" })}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  step.step_type === "text"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                    : "border-input bg-background text-muted-foreground"
                }`}
              >
                Text (type reply)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs text-muted-foreground">Prompt (sent on WhatsApp)</label>
          <Textarea
            value={step.prompt}
            onChange={(e) => props.onChange({ prompt: e.target.value })}
            rows={2}
            placeholder="Which class is your child in, Class 6 or Class 8?"
          />
        </div>

        {step.step_type === "choice" ? (
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-muted-foreground">
              Options (1–10). Each routes the customer somewhere. A single option auto-skips the step.
            </label>
            {step.options.map((o, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  className="sm:max-w-xs"
                  value={o.label}
                  onChange={(e) => props.onOptionLabel(i, e.target.value)}
                  placeholder={`Option ${i + 1} label`}
                />
                <div className="flex-1">
                  <TargetPicker
                    value={o.target}
                    onChange={(v) => props.onOptionTarget(i, v)}
                    steps={props.steps}
                    tests={props.tests}
                    excludeStepId={step.id}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => props.onRemoveOption(i)}
                  disabled={step.options.length <= 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={props.onAddOption} disabled={step.options.length >= 10}>
              <Plus className="mr-1 h-4 w-4" /> Add option
            </Button>
            <p className="text-xs text-muted-foreground">
              WhatsApp shows a button for each option. Picking one continues the flow or launches the test.
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <label className="mb-1 block text-xs text-muted-foreground">
              After the customer replies, continue to…
            </label>
            <TargetPicker
              value={step.target}
              onChange={(v) => props.onChange({ target: v })}
              steps={props.steps}
              tests={props.tests}
              excludeStepId={step.id}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The typed reply is recorded under the step&apos;s key (/class), useable for routing. A target of the same step is not allowed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}