"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronUp,
  ChevronDown,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { toast } from "sonner";
import type {
  Test,
  TestQuestion,
  TestIntroField,
} from "@/types";
import { generateCsvTemplate, parseImportCsv, type ParsedQuestion } from "@/lib/csv";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type DraftTest = {
  title: string;
  description: string;
  start_message: string;
  mode: "practice" | "test";
  duration_minutes: number;
  pass_mark: number;
  shuffle: boolean;
  is_active: boolean;
  intro_fields: DraftIntroField[];
};

type DraftIntroField = {
  key: string;
  label: string;
  type: "text" | "choice";
  optionsRaw: string; // comma-separated for textarea
};

function emptyDraft(): DraftTest {
  return {
    title: "",
    description: "",
    start_message: "",
    mode: "practice",
    duration_minutes: 0,
    pass_mark: 0,
    shuffle: false,
    is_active: true,
    intro_fields: [],
  };
}

function toPayload(d: DraftTest) {
  return {
    title: d.title,
    description: d.description || null,
    start_message: d.start_message || null,
    mode: d.mode,
    duration_minutes: d.mode === "test" && d.duration_minutes > 0 ? d.duration_minutes : null,
    pass_mark: d.pass_mark,
    shuffle: d.shuffle,
    is_active: d.is_active,
    intro_fields: d.intro_fields.map((f) => ({
      key: f.key.trim(),
      label: f.label.trim(),
      type: f.type,
      options: f.type === "choice"
        ? f.optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
        : undefined,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Root component                                                     */
/* ------------------------------------------------------------------ */

export function TestBuilderScreen() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftEditId, setDraftEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftTest>(emptyDraft());
  const [saving, setSaving] = useState(false);

  // Selected test for the questions panel
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  // Delete confirmation
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Fetch list ---- */
  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tests", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
    const onFocus = () => fetchTests();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchTests]);

  /* ---- Fetch single test with questions ---- */
  const fetchTest = useCallback(async (id: string) => {
    setSelectedLoading(true);
    try {
      const res = await fetch(`/api/tests/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTest(data.test ?? null);
      }
    } catch {
      /* ignore */
    } finally {
      setSelectedLoading(false);
    }
  }, []);

  /* ---- Open create dialog ---- */
  function openCreate() {
    setDraftEditId(null);
    setDraft(emptyDraft());
    setDraftOpen(true);
  }

  /* ---- Open edit dialog ---- */
  function openEdit(t: Test) {
    setDraftEditId(t.id);
    setDraft({
      title: t.title,
      description: t.description || "",
      start_message: (t as any).start_message || "",
      mode: t.mode,
      duration_minutes: t.duration_minutes ?? 0,
      pass_mark: t.pass_mark,
      shuffle: t.shuffle,
      is_active: t.is_active,
      intro_fields: (Array.isArray(t.intro_fields) ? t.intro_fields : []).map((f: any) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        optionsRaw: Array.isArray(f.options) ? f.options.join(", ") : "",
      })),
    });
    setDraftOpen(true);
  }

  /* ---- Save test ---- */
  async function saveTest() {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const url = draftEditId ? `/api/tests/${draftEditId}` : "/api/tests";
      const method = draftEditId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(draft)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success(draftEditId ? "Test updated" : "Test created");
      setDraftOpen(false);
      await fetchTests();
      if (!draftEditId && data.test?.id) {
        await fetchTest(data.test.id);
      } else if (draftEditId) {
        await fetchTest(draftEditId);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  /* ---- Toggle active inline ---- */
  async function toggleActive(t: Test) {
    const res = await fetch(`/api/tests/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !t.is_active }),
    });
    if (res.ok) {
      setTests((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: !x.is_active } : x)));
      if (selectedTest?.id === t.id) setSelectedTest((s) => s ? { ...s, is_active: !s.is_active } : s);
    }
  }

  /* ---- Delete test ---- */
  async function deleteTest() {
    if (!testToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tests/${testToDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Test deleted");
      setTests((prev) => prev.filter((x) => x.id !== testToDelete.id));
      if (selectedTest?.id === testToDelete.id) setSelectedTest(null);
      setTestToDelete(null);
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  /* ---- Refresh questions after mutation ---- */
  const refreshQuestions = useCallback(async () => {
    if (selectedTest) await fetchTest(selectedTest.id);
  }, [selectedTest, fetchTest]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tests &amp; Practice</h1>
          <p className="text-sm text-muted-foreground">
            Create practice drills or timed tests for your customers via WhatsApp.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" /> New Test
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : tests.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No tests yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <div
              key={t.id}
              className={`group relative rounded-lg border p-4 transition-colors hover:bg-accent/40 ${selectedTest?.id === t.id ? "border-primary bg-accent/50 ring-1 ring-primary" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <button className="text-left flex-1" onClick={() => fetchTest(t.id)}>
                  <h3 className="font-semibold leading-tight line-clamp-1">{t.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {t.description || t.mode === "test" ? `Mode: ${t.mode}` : ""}
                  </p>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={t.mode === "test" ? "destructive" : "secondary"} className="text-[10px] uppercase">
                    {t.mode}
                  </Badge>
                  <Badge variant={t.is_active ? "default" : "outline"} className="text-[10px]">
                    {t.is_active ? "Active" : "Draft"}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{t.question_count ?? t.questions?.length ?? 0} Q</span>
                {t.pass_mark > 0 && <span>Pass: {t.pass_mark}%</span>}
                {t.mode === "test" && t.duration_minutes && <span>{t.duration_minutes} min</span>}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={() => openEdit(t)}
                >
                  <Edit2 className="size-3" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={() => toggleActive(t)}
                >
                  {t.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-destructive"
                  onClick={() => setTestToDelete(t)}
                >
                  <Trash2 className="size-3" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Questions panel */}
      {selectedTest && (
        <div className="rounded-lg border p-4">
          <QuestionsEditor
            test={selectedTest}
            loading={selectedLoading}
            refresh={refreshQuestions}
            onEditTest={() => openEdit(selectedTest)}
            onDeselect={() => setSelectedTest(null)}
          />
        </div>
      )}

      {/* Create / Edit dialog */}
      <TestEditorDialog
        open={draftOpen}
        isEdit={!!draftEditId}
        draft={draft}
        setDraft={setDraft}
        onClose={() => setDraftOpen(false)}
        onSave={saveTest}
        saving={saving}
      />

      {/* Delete confirmation */}
      <ConfirmationModal
        open={!!testToDelete}
        onOpenChange={(v) => { if (!v) setTestToDelete(null); }}
        onConfirm={deleteTest}
        title="Delete test?"
        description={`Are you sure you want to delete "${testToDelete?.title ?? ""}"? This will remove all questions and cannot be undone.`}
        variant="destructive"
        confirmText={deleting ? "Deleting..." : "Delete"}
        loading={deleting}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Test Create / Edit Dialog                                          */
/* ------------------------------------------------------------------ */

function TestEditorDialog({
  open,
  isEdit,
  draft,
  setDraft,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  isEdit: boolean;
  draft: DraftTest;
  setDraft: (fn: (d: DraftTest) => DraftTest) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Test / Practice" : "New Test / Practice"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Title *</label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="O Level Math Practice"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Description</label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="A short description shown to students."
              className="min-h-16"
            />
          </div>

          {/* Start message */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Welcome / Start message</label>
            <Textarea
              value={draft.start_message}
              onChange={(e) => setDraft((d) => ({ ...d, start_message: e.target.value }))}
              placeholder="Welcome to the quiz! Tap Start when ready."
              className="min-h-16"
            />
          </div>

          {/* Mode + duration */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={draft.mode === "test"}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      mode: v ? "test" : "practice",
                    }))
                  }
                />
                <span className="text-xs font-medium">
                  {draft.mode === "test" ? "Timed test mode" : "Practice mode"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {draft.mode === "test"
                  ? "Timed: hides answers until the end, enforces a deadline, reports score."
                  : "Practice: reveals correct/incorrect after each answer."}
              </p>
            </div>
            {draft.mode === "test" && (
              <div className="w-28 space-y-1">
                <label className="text-xs font-medium">Minutes</label>
                <Input
                  type="number"
                  min={1}
                  value={draft.duration_minutes || ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, duration_minutes: Number(e.target.value) || 0 }))
                  }
                  placeholder="—"
                />
              </div>
            )}
          </div>

          {/* Pass mark + shuffle + active */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Pass mark %</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={draft.pass_mark}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, pass_mark: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))
                }
              />
            </div>
            <div className="flex flex-col justify-end gap-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={draft.shuffle}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, shuffle: v }))}
                />
                <span className="text-xs">Shuffle Qs</span>
              </div>
            </div>
            <div className="flex flex-col justify-end gap-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))}
                />
                <span className="text-xs">Active</span>
              </div>
            </div>
          </div>

          {/* Intro fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Intro questions (before the test)</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 gap-1 text-[10px]"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    intro_fields: [
                      ...d.intro_fields,
                      { key: "", label: "", type: "choice", optionsRaw: "" },
                    ],
                  }))
                }
              >
                <Plus className="size-3" /> Add field
              </Button>
            </div>
            {draft.intro_fields.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic">
                No intro questions. The test starts directly with practice questions.
              </p>
            )}
            {draft.intro_fields.map((field, i) => (
              <IntroFieldRow
                key={i}
                field={field}
                onChange={(patch) =>
                  setDraft((d) => ({
                    ...d,
                    intro_fields: d.intro_fields.map((f, j) => (j === i ? { ...f, ...patch } : f)),
                  }))
                }
                onRemove={() =>
                  setDraft((d) => ({
                    ...d,
                    intro_fields: d.intro_fields.filter((_, j) => j !== i),
                  }))
                }
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button onClick={onSave} disabled={saving || !draft.title.trim()} className="h-8 text-xs">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IntroFieldRow({
  field,
  onChange,
  onRemove,
}: {
  field: DraftIntroField;
  onChange: (patch: Partial<DraftIntroField>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border p-2">
      <div className="grid flex-1 grid-cols-[80px_1fr_100px] gap-2">
        <Input
          placeholder="key"
          value={field.key}
          onChange={(e) => onChange({ key: e.target.value })}
          className="h-7 text-xs"
        />
        <Input
          placeholder="Label shown to student"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-7 text-xs"
        />
        <Select value={field.type} onValueChange={(v) => { if (v === "text" || v === "choice") onChange({ type: v }); }}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Free text</SelectItem>
            <SelectItem value="choice">Choice</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {field.type === "choice" && (
        <Input
          placeholder="Option A, Option B"
          value={field.optionsRaw}
          onChange={(e) => onChange({ optionsRaw: e.target.value })}
          className="h-7 flex-1 text-xs"
        />
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-destructive"
        onClick={onRemove}
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Questions Editor (inline, appears below test list when selected)   */
/* ------------------------------------------------------------------ */

function QuestionsEditor({
  test,
  loading,
  refresh,
  onEditTest,
  onDeselect,
}: {
  test: Test;
  loading: boolean;
  refresh: () => void;
  onEditTest: () => void;
  onDeselect: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{test.title}</h3>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onEditTest}>
            <Pencil className="size-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setImportOpen(true)}>
            Bulk import CSV
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAdding(true)}>
            <Plus className="size-3 mr-1" /> Add question
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onDeselect}>
            Close
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading questions...</p>
      ) : (
        <QuestionsList
          test={test}
          refresh={refresh}
          editingId={editingId}
          setEditingId={setEditingId}
        />
      )}

      {adding && (
        <QuestionForm
          testId={test.id}
          onSave={() => { setAdding(false); refresh(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {importOpen && (
        <ImportDialog
          testId={test.id}
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); refresh(); }}
        />
      )}
    </div>
  );
}

function QuestionsList({
  test,
  refresh,
  editingId,
  setEditingId,
}: {
  test: Test;
  refresh: () => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const questions = (test.questions ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  if (questions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        No questions yet. Add one above.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((q) =>
        editingId === q.id ? (
          <QuestionForm
            key={q.id}
            testId={test.id}
            question={q}
            onSave={() => { setEditingId(null); refresh(); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <QuestionRow
            key={q.id}
            question={q}
            total={questions.length}
            onEdit={() => setEditingId(q.id)}
            onDelete={async () => {
              if (!confirm("Delete this question?")) return;
              const res = await fetch(`/api/tests/${test.id}/questions/${q.id}`, { method: "DELETE" });
              if (res.ok) {
                toast.success("Question deleted");
                refresh();
              } else {
                toast.error("Failed to delete");
              }
            }}
            onMove={async (dir) => {
              const newPos = q.position + dir;
              if (newPos < 0) return;
              const res = await fetch(`/api/tests/${test.id}/questions/${q.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ position: newPos }),
              });
              if (res.ok) refresh();
            }}
          />
        )
      )}
    </div>
  );
}

function QuestionRow({
  question,
  total,
  onEdit,
  onDelete,
  onMove,
}: {
  question: TestQuestion;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border p-2 bg-card">
      <div className="flex flex-col gap-0.5 pt-0.5">
        <button disabled={question.position <= 0} onClick={() => onMove(-1)}>
          <ChevronUp className="size-3 text-muted-foreground hover:text-foreground" />
        </button>
        <button disabled={question.position >= total - 1} onClick={() => onMove(1)}>
          <ChevronDown className="size-3 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium line-clamp-1">{question.question}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {question.options?.length ?? 0} options
          {question.correct_answer ? ` · correct: ${question.correct_answer}` : ""}
          {question.points > 0 ? ` · ${question.points} pt` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onEdit}>
          <Pencil className="size-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={onDelete}>
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Question Create / Edit form                                        */
/* ------------------------------------------------------------------ */

function QuestionForm({
  testId,
  question,
  onSave,
  onCancel,
}: {
  testId: string;
  question?: TestQuestion;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(question?.question ?? "");
  const [options, setOptions] = useState<{ key: string; label: string }[]>(
    question?.options?.length ? question.options.map((o) => ({ key: o.key, label: o.label })) : [{ key: "A", label: "" }, { key: "B", label: "" }]
  );
  const [correctKey, setCorrectKey] = useState(question?.correct_answer ?? "");
  const [points, setPoints] = useState(question?.points ?? 1);
  const [saving, setSaving] = useState(false);

  const isEdit = !!question;

  function addOption() {
    const nextKey = String.fromCharCode(65 + options.length);
    setOptions((o) => [...o, { key: nextKey, label: "" }]);
  }

  function updateOption(idx: number, patch: Partial<{ key: string; label: string }>) {
    setOptions((o) => o.map((opt, i) => (i === idx ? { ...opt, ...patch } : opt)));
  }

  function removeOption(idx: number) {
    setOptions((o) => o.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!text.trim()) { toast.error("Question text required"); return; }
    const validOpts = options.filter((o) => o.key.trim() && o.label.trim());
    if (validOpts.length < 2) { toast.error("At least 2 options needed"); return; }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/tests/${testId}/questions/${question!.id}`
        : `/api/tests/${testId}/questions`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text.trim(),
          options: validOpts,
          correct_answer: correctKey || null,
          points: points || 1,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success(isEdit ? "Question updated" : "Question added");
      onSave();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border p-3 space-y-3 bg-card">
      <div className="space-y-1">
        <label className="text-xs font-medium">Question</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What is 2 + 2?"
          className="min-h-16 text-sm"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Options</label>
          <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={addOption}>
            <Plus className="size-3" /> Add option
          </Button>
        </div>
        <div className="space-y-1">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${testId}-${question?.id ?? "new"}`}
                checked={correctKey === opt.key}
                onChange={() => setCorrectKey(opt.key)}
                className="size-3 mt-0.5 shrink-0"
              />
              <Input
                value={opt.key}
                onChange={(e) => updateOption(i, { key: e.target.value })}
                className="h-7 w-12 text-xs"
                placeholder="A"
              />
              <Input
                value={opt.label}
                onChange={(e) => updateOption(i, { label: e.target.value })}
                className="h-7 flex-1 text-xs"
                placeholder="Option text"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive"
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Click the radio to mark the correct answer.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Points</label>
          <Input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value) || 1)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update" : "Add"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bulk CSV Import Dialog                                             */
/* ------------------------------------------------------------------ */

function ImportDialog({
  testId,
  onClose,
  onImported,
}: {
  testId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [preview, setPreview] = useState<ParsedQuestion[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseImportCsv(text);
      if (parsed.length === 0) {
        setError("No valid questions found in the CSV. Check the format and try again.");
        return;
      }
      setPreview(parsed);
    };
    reader.readAsText(file);
  }

  async function doImport() {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/tests/${testId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: preview }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Import failed");
        return;
      }
      toast.success(`Imported ${data.count ?? preview.length} questions`);
      onImported();
    } catch {
      setError("Network error");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = generateCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test_questions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            Upload a CSV file with columns: question, option_a, option_b, option_c, option_d, correct_option (A/B/C/D), points.
          </p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={downloadTemplate}>
            Download template CSV
          </Button>

          <div className="space-y-1">
            <label className="text-xs font-medium">Select CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full text-xs file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-accent"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {preview && (
            <div className="space-y-2">
              <p className="text-xs font-medium">{preview.length} question(s) ready to import:</p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded border p-2">
                {preview.map((q, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground">
                    {i + 1}. {q.question.slice(0, 60)}
                    {q.correct_answer ? ` (answer: ${q.correct_answer})` : ""}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button onClick={doImport} disabled={!preview || preview.length === 0 || importing} className="h-8 text-xs">
            {importing ? "Importing..." : `Import ${preview?.length ?? 0} questions`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}