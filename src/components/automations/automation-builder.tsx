"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  FileText,
  Tag,
  TagIcon,
  UserCheck,
  PencilLine,
  Briefcase,
  Hourglass,
  GitBranch,
  Webhook,
  CircleSlash,
  Zap,
  Loader2,
  ArrowDown,
  ArrowUp,
  TableProperties,
  ArrowRight,
  MousePointerClick,
  LayoutList,
  Workflow,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {
  Automation,
  AutomationStepType,
  AutomationTriggerType,
  KeywordMatchTriggerConfig,
} from "@/types"
import { cn } from "@/lib/utils"

// ------------------------------------------------------------
// Types (builder-local — mirror the flattened rows we POST)
// ------------------------------------------------------------

export interface BuilderStep {
  /** Client id; the API assigns real UUIDs server-side. */
  cid: string
  step_type: AutomationStepType
  step_config: Record<string, unknown>
  branches?: { yes: BuilderStep[]; no: BuilderStep[] }
}

export interface BuilderInitial {
  id?: string
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, unknown>
  is_active: boolean
  steps: BuilderStep[]
}

// ------------------------------------------------------------
// Step metadata — one source of truth for icon + label + border color
// ------------------------------------------------------------

interface StepMeta {
  label: string
  icon: typeof Zap
  /** Left-border accent color per spec. */
  border: string
}

const STEP_META: Record<AutomationStepType, StepMeta> = {
  send_message: { label: "Send Message", icon: MessageSquare, border: "border-l-primary" },
  send_template: { label: "Send Template", icon: FileText, border: "border-l-primary" },
  add_tag: { label: "Add Tag", icon: Tag, border: "border-l-primary" },
  remove_tag: { label: "Remove Tag", icon: TagIcon, border: "border-l-primary" },
  assign_conversation: { label: "Assign Conversation", icon: UserCheck, border: "border-l-primary" },
  assign_to_ai: { label: "Assign to AI assistant", icon: Loader2, border: "border-l-primary" },
  update_contact_field: { label: "Update Contact Field", icon: PencilLine, border: "border-l-primary" },
  create_deal: { label: "Create Deal", icon: Briefcase, border: "border-l-primary" },
  wait: { label: "Wait", icon: Hourglass, border: "border-l-muted-foreground/40" },
  condition: { label: "Condition (If/Else)", icon: GitBranch, border: "border-l-amber-500" },
  send_webhook: { label: "Send Webhook", icon: Webhook, border: "border-l-primary" },
  close_conversation: { label: "Close Conversation", icon: CircleSlash, border: "border-l-primary" },
  lookup_spreadsheet: { label: "Lookup Spreadsheet", icon: TableProperties, border: "border-l-emerald-500" },
  whatsapp_interaction: { label: "WhatsApp Interaction", icon: MousePointerClick, border: "border-l-indigo-500" },
  whatsapp_flow: { label: "WhatsApp Flow", icon: LayoutList, border: "border-l-violet-500" },
  trigger_automation: { label: "Trigger Automation", icon: Workflow, border: "border-l-orange-500" },
}

const ADDABLE_STEPS: AutomationStepType[] = [
  "send_message",
  "send_template",
  "whatsapp_interaction",
  "whatsapp_flow",
  "trigger_automation",
  "lookup_spreadsheet",
  "add_tag",
  "remove_tag",
  "assign_conversation",
  "assign_to_ai",
  "update_contact_field",
  "create_deal",
  "wait",
  "condition",
  "send_webhook",
  "close_conversation",
]

const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string; hint: string }[] = [
  { value: "new_message_received", label: "New Message Received", hint: "Any incoming message" },
  {
    value: "first_inbound_message",
    label: "First Message from Contact",
    hint: "First time this contact ever messages you (works for manually-added contacts too)",
  },
  { value: "keyword_match", label: "Keyword Match", hint: "Message contains specific keyword(s)" },
  { value: "new_contact_created", label: "New Contact Created", hint: "When a contact is auto-created from an incoming message" },
  { value: "conversation_assigned", label: "Conversation Assigned", hint: "When assigned to an agent" },
  { value: "tag_added", label: "Tag Added", hint: "When a tag is added to a contact" },
  { value: "time_based", label: "Time-Based", hint: "On a recurring schedule" },
]

function cid(): string {
  return (
    "c_" +
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36))
  )
}

function blankConfig(type: AutomationStepType): Record<string, unknown> {
  switch (type) {
    case "send_message":
      return { text: "" }
    case "send_template":
      return { template_name: "", language: "en_US" }
    case "add_tag":
    case "remove_tag":
      return { tag_id: "" }
    case "assign_conversation":
      return { mode: "round_robin" }
    case "update_contact_field":
      return { field: "name", value: "" }
    case "create_deal":
      return { pipeline_id: "", stage_id: "", title: "", value: 0 }
    case "wait":
      return { amount: 1, unit: "hours" }
    case "condition":
      return { subject: "tag_presence", operand: "", value: "" }
    case "send_webhook":
      return { url: "", headers: {}, body_template: "" }
    case "assign_to_ai":
      return { enable_fallback_to_human: false }
    case "lookup_spreadsheet":
      return { sheet_name: "Sheet1", search_column: "", search_value: "", mapping: {} }
    case "whatsapp_interaction":
      return { body: "", items: [{ id: "1", label: "Option 1" }] }
    case "whatsapp_flow":
      return { flow_id: "", screen_id: "", initial_data: {} }
    case "trigger_automation":
      return { automation_id: "" }
    case "close_conversation":
      return {}
    default:
      return {}
  }
}

// ------------------------------------------------------------
// Main builder component
// ------------------------------------------------------------

export function AutomationBuilder({ initial }: { initial: BuilderInitial }) {
  const router = useRouter()
  const isEditing = !!initial.id
  const [state, setState] = useState<BuilderInitial>(initial)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [availableAutomations, setAvailableAutomations] = useState<Automation[]>([])

  useEffect(() => {
    fetch("/api/automations")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.automations)) {
          setAvailableAutomations(data.automations.filter((a: any) => a.id !== initial.id))
        }
      })
      .catch(console.error)
  }, [initial.id])

  function patchTop<K extends keyof BuilderInitial>(key: K, value: BuilderInitial[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  // --- Step tree mutations (immutable) ---

  function updateStep(path: StepPath, updater: (s: BuilderStep) => BuilderStep) {
    setState((s) => ({ ...s, steps: mapAtPath(s.steps, path, updater) }))
  }

  function addStepAt(parent: ParentScope, index: number, type: AutomationStepType) {
    const node: BuilderStep = {
      cid: cid(),
      step_type: type,
      step_config: blankConfig(type),
      branches: type === "condition" ? { yes: [], no: [] } : undefined,
    }
    setState((s) => ({ ...s, steps: insertAt(s.steps, parent, index, node) }))
    setExpandedId(node.cid)
  }

  function deleteStepAt(path: StepPath) {
    setState((s) => ({ ...s, steps: removeAt(s.steps, path) }))
  }

  function moveStepAt(path: StepPath, direction: -1 | 1) {
    setState((s) => ({ ...s, steps: moveAt(s.steps, path, direction) }))
  }

  async function save() {
    setSaving(true)
    try {
      const payload = {
        name: state.name || "Untitled automation",
        description: state.description || null,
        trigger_type: state.trigger_type,
        trigger_config: state.trigger_config,
        is_active: state.is_active,
        steps: toApiSteps(state.steps),
      }

      const res = isEditing
        ? await fetch(`/api/automations/${initial.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })
        : await fetch(`/api/automations`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })

      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const firstIssue: { path?: string; message?: string } | undefined =
          body?.issues?.[0]
        if (firstIssue?.message) {
          toast.error(firstIssue.message, {
            description: firstIssue.path ? `at ${firstIssue.path}` : undefined,
          })
        } else {
          toast.error(body?.error ?? "Save failed")
        }
        return
      }
      toast.success(isEditing ? "Automation saved" : "Automation created")
      if (!isEditing && body?.automation?.id) {
        router.replace(`/automations/${body.automation.id}/edit`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-card/80 px-3 py-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={() => router.push("/automations")}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back to automations"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          value={state.name}
          onChange={(e) => patchTop("name", e.target.value)}
          placeholder="Untitled automation"
          className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:bg-muted focus:outline-none sm:text-base"
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Active</span>
          <Switch
            checked={state.is_active}
            onCheckedChange={(v) => patchTop("is_active", !!v)}
            aria-label="Active"
          />
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditing ? "Save" : "Save Draft"}
        </Button>
      </header>

      <div className="relative flex-1 overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle,color-mix(in_oklch,var(--muted-foreground),transparent_85%)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-0 px-4 py-10">
          <TriggerCard
            type={state.trigger_type}
            config={state.trigger_config}
            onTypeChange={(t) => patchTop("trigger_type", t)}
            onConfigChange={(c) => patchTop("trigger_config", c)}
          />
          <StepList
            steps={state.steps}
            parentPath={[]}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            updateStep={updateStep}
            addStepAt={addStepAt}
            deleteStepAt={deleteStepAt}
            moveStepAt={moveStepAt}
            availableAutomations={availableAutomations}
          />
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Trigger card
// ------------------------------------------------------------

function TriggerCard({
  type,
  config,
  onTypeChange,
  onConfigChange,
}: {
  type: AutomationTriggerType
  config: Record<string, unknown>
  onTypeChange: (t: AutomationTriggerType) => void
  onConfigChange: (c: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="z-10 w-full max-w-[320px] sm:w-80">
      <div className="rounded-lg border border-border border-l-4 border-l-blue-500 bg-card shadow-lg">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-blue-500/70">Trigger</div>
            <div className="truncate text-sm font-medium text-foreground">
              {TRIGGER_OPTIONS.find((o) => o.value === type)?.label ?? type}
            </div>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </button>
        {open && (
          <div className="space-y-3 border-t border-border px-4 py-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Trigger type
              </label>
              <select
                value={type}
                onChange={(e) => onTypeChange(e.target.value as AutomationTriggerType)}
                className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                {TRIGGER_OPTIONS.find((o) => o.value === type)?.hint}
              </p>
            </div>
            {type === "keyword_match" && (
              <KeywordMatchConfig
                config={config as unknown as KeywordMatchTriggerConfig}
                onChange={onConfigChange}
              />
            )}
            {type === "tag_added" && (
              <Input
                placeholder="Tag id"
                value={(config.tag_id as string) ?? ""}
                onChange={(e) =>
                  onConfigChange({ ...config, tag_id: e.target.value })
                }
                className="bg-muted text-foreground"
              />
            )}
            {type === "time_based" && (
              <Input
                placeholder="Cron expression or HH:mm"
                value={(config.schedule as string) ?? ""}
                onChange={(e) =>
                  onConfigChange({ ...config, schedule: e.target.value })
                }
                className="bg-muted text-foreground"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KeywordMatchConfig({
  config,
  onChange,
}: {
  config: KeywordMatchTriggerConfig
  onChange: (c: Record<string, unknown>) => void
}) {
  const keywords = config?.keywords ?? []
  return (
    <div className="space-y-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Keywords (comma-separated)
        </label>
        <Input
          value={keywords.join(", ")}
          onChange={(e) =>
            onChange({
              ...config,
              keywords: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          className="bg-muted text-foreground"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Match type
        </label>
        <select
          value={config?.match_type ?? "contains"}
          onChange={(e) => onChange({ ...config, match_type: e.target.value as "exact" | "contains" })}
          className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm text-foreground focus:outline-none"
        >
          <option value="contains">Contains</option>
          <option value="exact">Exact</option>
        </select>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Step list + card + connectors
// ------------------------------------------------------------

type ParentScope =
  | { kind: "root" }
  | { kind: "branch"; parentCid: string; branch: "yes" | "no" }

type StepPath = (
  | { kind: "root"; index: number }
  | { kind: "branch"; parentCid: string; branch: "yes" | "no"; index: number }
)[]

interface StepListProps {
  steps: BuilderStep[]
  parentPath: StepPath
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  updateStep: (path: StepPath, updater: (s: BuilderStep) => BuilderStep) => void
  addStepAt: (parent: ParentScope, index: number, type: AutomationStepType) => void
  deleteStepAt: (path: StepPath) => void
  moveStepAt: (path: StepPath, direction: -1 | 1) => void
  availableAutomations: Automation[]
}

function StepList(props: StepListProps) {
  const { steps, parentPath, ...rest } = props
  const parentScope: ParentScope =
    parentPath.length === 0
      ? { kind: "root" }
      : (() => {
        const last = parentPath[parentPath.length - 1]
        if (last.kind !== "branch") return { kind: "root" } as const
        return { kind: "branch", parentCid: last.parentCid, branch: last.branch } as const
      })()

  return (
    <div className="flex flex-col items-center">
      <AddButton onPick={(t) => props.addStepAt(parentScope, 0, t)} />
      {steps.map((step, idx) => (
        <StepRenderer
          key={step.cid}
          step={step}
          index={idx}
          total={steps.length}
          parentScope={parentScope}
          parentPath={parentPath}
          {...rest}
        />
      ))}
    </div>
  )
}

function StepRenderer({
  step,
  index,
  total,
  parentScope,
  parentPath,
  ...props
}: {
  step: BuilderStep
  index: number
  total: number
  parentScope: ParentScope
  parentPath: StepPath
} & Omit<StepListProps, "steps" | "parentPath">) {
  const path: StepPath = [
    ...parentPath,
    parentScope.kind === "root"
      ? { kind: "root", index }
      : { kind: "branch", parentCid: parentScope.parentCid, branch: parentScope.branch, index },
  ]
  const meta = STEP_META[step.step_type]
  const Icon = meta.icon
  const expanded = props.expandedId === step.cid
  const isCondition = step.step_type === "condition"
  const width = isCondition
    ? "w-full max-w-[400px] sm:w-[400px]"
    : "w-full max-w-[320px] sm:w-80"

  return (
    <>
      <div className={cn("z-10 flex flex-col", width)}>
        <div
          className={cn(
            "rounded-lg border border-border border-l-4 bg-card shadow-lg",
            meta.border,
          )}
        >
          <button
            type="button"
            onClick={() => props.setExpandedId(expanded ? null : step.cid)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" aria-hidden />
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground/60">
                {isCondition ? "Condition" : step.step_type === "wait" ? "Wait" : "Action"}
              </div>
              <div className="truncate text-sm font-medium text-foreground">{meta.label}</div>
              <div className="truncate text-[11px] text-muted-foreground/50">{previewFor(step)}</div>
            </div>
            <ChevronDown
              className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
            />
          </button>
          {expanded && (
            <div className="border-t border-border px-4 py-3">
              <StepEditor
                step={step}
                onChange={(next) => props.updateStep(path, () => next)}
                availableAutomations={props.availableAutomations}
              />
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    aria-label="Move up"
                    onClick={() => props.moveStepAt(path, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === total - 1}
                    aria-label="Move down"
                    onClick={() => props.moveStepAt(path, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => props.deleteStepAt(path)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        {isCondition && (
          <ConditionBranches step={step} parentPath={path} {...props} />
        )}
      </div>

      <AddButton
        onPick={(t) => props.addStepAt(parentScope, index + 1, t)}
      />
    </>
  )
}

function ConditionBranches({
  step,
  parentPath,
  ...props
}: {
  step: BuilderStep
  parentPath: StepPath
} & Omit<StepListProps, "steps" | "parentPath">) {
  const yes = step.branches?.yes ?? []
  const no = step.branches?.no ?? []
  const yesPath: StepPath = [
    ...parentPath,
    { kind: "branch", parentCid: step.cid, branch: "yes", index: 0 },
  ]
  const noPath: StepPath = [
    ...parentPath,
    { kind: "branch", parentCid: step.cid, branch: "no", index: 0 },
  ]
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <BranchColumn label="Yes" color="text-primary">
        <StepList {...props} steps={yes} parentPath={yesPath} />
      </BranchColumn>
      <BranchColumn label="No" color="text-rose-400">
        <StepList {...props} steps={no} parentPath={noPath} />
      </BranchColumn>
    </div>
  )
}

function BranchColumn({
  label,
  color,
  children,
}: {
  label: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={cn("mb-2 text-[11px] font-semibold uppercase", color)}>{label}</div>
      {children}
    </div>
  )
}

function AddButton({ onPick }: { onPick: (t: AutomationStepType) => void }) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="h-4 w-[2px] bg-border" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary data-[popup-open]:border-primary data-[popup-open]:bg-primary/20 data-[popup-open]:text-primary"
          aria-label="Add step"
        >
          <Plus className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-80 min-w-56 overflow-y-auto border-border bg-popover"
        >
          {ADDABLE_STEPS.map((t) => {
            const Icon = STEP_META[t].icon
            return (
              <DropdownMenuItem key={t} onClick={() => onPick(t)}>
                <Icon className="h-4 w-4" />
                {STEP_META[t].label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="h-4 w-[2px] bg-border" aria-hidden />
    </div>
  )
}

// ------------------------------------------------------------
// Per-step config editor
// ------------------------------------------------------------

function StepEditor({
  step,
  onChange,
  availableAutomations,
}: {
  step: BuilderStep
  onChange: (s: BuilderStep) => void
  availableAutomations: Automation[]
}) {
  const cfg = step.step_config
  const set = (patch: Record<string, unknown>) =>
    onChange({ ...step, step_config: { ...cfg, ...patch } })

  switch (step.step_type) {
    case "send_message":
      return (
        <FieldBlock label="Message text">
          <Textarea
            value={(cfg.text as string) ?? ""}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Hi! Thanks for reaching out…"
            className="min-h-24 bg-muted text-foreground"
          />
        </FieldBlock>
      )
    case "send_template":
      return (
        <>
          <FieldBlock label="Template name">
            <Input
              value={(cfg.template_name as string) ?? ""}
              onChange={(e) => set({ template_name: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Language">
            <Input
              value={(cfg.language as string) ?? ""}
              onChange={(e) => set({ language: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
        </>
      )
    case "whatsapp_interaction":
      return (
        <>
          <FieldBlock label="Header (Optional)">
            <Input
              value={(cfg.header as string) ?? ""}
              onChange={(e) => set({ header: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Body text">
            <Textarea
              value={(cfg.body as string) ?? ""}
              onChange={(e) => set({ body: e.target.value })}
              placeholder="Select an option:"
              className="min-h-20 bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Footer (Optional)">
            <Input
              value={(cfg.footer as string) ?? ""}
              onChange={(e) => set({ footer: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <div className="space-y-2 border-t border-border pt-3 mt-2">
            <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              Buttons / List Items
            </label>
            <p className="text-[10px] text-muted-foreground/60 leading-tight mb-2">
              Add 1-3 for reply buttons, 4-10 for a list menu.
            </p>
            {((cfg.items as any[]) || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <Input
                  value={item.id}
                  onChange={(e) => {
                    const items = [...(cfg.items as any[])]
                    items[idx] = { ...items[idx], id: e.target.value }
                    set({ items })
                  }}
                  placeholder="ID (e.g. 1)"
                  className="h-8 w-16 bg-muted text-[11px]"
                />
                <Input
                  value={item.label}
                  onChange={(e) => {
                    const items = [...(cfg.items as any[])]
                    items[idx] = { ...items[idx], label: e.target.value }
                    set({ items })
                  }}
                  placeholder="Label (e.g. Yes)"
                  className="h-8 flex-1 bg-muted text-[11px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground/60 hover:text-destructive"
                  onClick={() => {
                    const items = [...(cfg.items as any[])]
                    items.splice(idx, 1)
                    set({ items })
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full border-dashed border-border bg-transparent text-[10px] text-muted-foreground/60 hover:bg-muted"
              onClick={() => {
                const items = [...((cfg.items as any[]) || [])]
                items.push({ id: String(items.length + 1), label: "New Option" })
                set({ items })
              }}
            >
              <Plus className="mr-1 h-3 w-3" /> Add Item
            </Button>
          </div>
        </>
      )
    case "whatsapp_flow":
      return (
        <>
          <FieldBlock label="Flow ID">
            <Input
              value={(cfg.flow_id as string) ?? ""}
              onChange={(e) => set({ flow_id: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Screen ID">
            <Input
              value={(cfg.screen_id as string) ?? ""}
              onChange={(e) => set({ screen_id: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
        </>
      )
    case "trigger_automation":
      return (
        <FieldBlock label="Target Automation">
          <select
            value={(cfg.automation_id as string) ?? ""}
            onChange={(e) => set({ automation_id: e.target.value })}
            className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm text-foreground"
          >
            <option value="">Select an automation...</option>
            {availableAutomations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </FieldBlock>
      )
    case "add_tag":
    case "remove_tag":
      return (
        <FieldBlock label="Tag id">
          <Input
            value={(cfg.tag_id as string) ?? ""}
            onChange={(e) => set({ tag_id: e.target.value })}
            className="bg-muted text-foreground"
          />
        </FieldBlock>
      )
    case "assign_conversation":
      return (
        <>
          <FieldBlock label="Mode">
            <select
              value={(cfg.mode as string) ?? "round_robin"}
              onChange={(e) => set({ mode: e.target.value })}
              className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm text-foreground"
            >
              <option value="round_robin">Round-robin</option>
              <option value="specific">Specific agent</option>
            </select>
          </FieldBlock>
          {cfg.mode === "specific" && (
            <FieldBlock label="Agent id">
              <Input
                value={(cfg.agent_id as string) ?? ""}
                onChange={(e) => set({ agent_id: e.target.value })}
                className="bg-muted text-foreground"
              />
            </FieldBlock>
          )}
        </>
      )
    case "update_contact_field":
      return (
        <>
          <FieldBlock label="Field">
            <select
              value={(cfg.field as string) ?? "name"}
              onChange={(e) => set({ field: e.target.value })}
              className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm text-foreground"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="company">Company</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Value">
            <Input
              value={(cfg.value as string) ?? ""}
              onChange={(e) => set({ value: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
        </>
      )
    case "create_deal":
      return (
        <>
          <FieldBlock label="Pipeline id">
            <Input
              value={(cfg.pipeline_id as string) ?? ""}
              onChange={(e) => set({ pipeline_id: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Stage id">
            <Input
              value={(cfg.stage_id as string) ?? ""}
              onChange={(e) => set({ stage_id: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Title">
            <Input
              value={(cfg.title as string) ?? ""}
              onChange={(e) => set({ title: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Value">
            <Input
              type="number"
              value={(cfg.value as number) ?? 0}
              onChange={(e) => set({ value: Number(e.target.value) })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
        </>
      )
    case "wait":
      return (
        <div className="grid grid-cols-2 gap-2">
          <FieldBlock label="Amount">
            <Input
              type="number"
              min={1}
              value={(cfg.amount as number) ?? 1}
              onChange={(e) => set({ amount: Math.max(1, Number(e.target.value)) })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Unit">
            <select
              value={(cfg.unit as string) ?? "hours"}
              onChange={(e) => set({ unit: e.target.value })}
              className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm text-foreground"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </FieldBlock>
        </div>
      )
    case "condition":
      return (
        <>
          <FieldBlock label="Subject">
            <select
              value={(cfg.subject as string) ?? "tag_presence"}
              onChange={(e) => set({ subject: e.target.value })}
              className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm text-foreground"
            >
              <option value="tag_presence">Tag presence</option>
              <option value="contact_field">Contact field</option>
              <option value="message_content">Message content</option>
              <option value="time_of_day">Time of day</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Operand">
            <Input
              placeholder={
                cfg.subject === "time_of_day"
                  ? "HH:mm-HH:mm"
                  : cfg.subject === "contact_field"
                    ? "field name or interaction_response"
                    : cfg.subject === "tag_presence"
                      ? "tag id"
                      : ""
              }
              value={(cfg.operand as string) ?? ""}
              onChange={(e) => set({ operand: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          {(cfg.subject === "contact_field" || cfg.subject === "message_content") && (
            <FieldBlock label="Value">
              <Input
                value={(cfg.value as string) ?? ""}
                onChange={(e) => set({ value: e.target.value })}
                className="bg-muted text-foreground"
              />
            </FieldBlock>
          )}
        </>
      )
    case "send_webhook":
      return (
        <>
          <FieldBlock label="URL">
            <Input
              value={(cfg.url as string) ?? ""}
              onChange={(e) => set({ url: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Body template (JSON)">
            <Textarea
              value={(cfg.body_template as string) ?? ""}
              onChange={(e) => set({ body_template: e.target.value })}
              className="min-h-20 bg-muted font-mono text-xs text-foreground"
            />
          </FieldBlock>
        </>
      )
    case "assign_to_ai":
      return (
        <FieldBlock label="Enable human fallback">
          <div className="flex items-center gap-3">
            <Switch
              checked={Boolean(cfg.enable_fallback_to_human)}
              onCheckedChange={(checked) => set({ enable_fallback_to_human: checked })}
            />
            <span className="text-sm text-muted-foreground">
              If AI is disabled for this conversation, keep it available for humans.
            </span>
          </div>
        </FieldBlock>
      )
    case "close_conversation":
      return (
        <p className="text-xs text-muted-foreground/60">
          Sets the conversation status to &quot;closed&quot;. No configuration needed.
        </p>
      )
    case "lookup_spreadsheet":
      return (
        <>
          <FieldBlock label="Sheet name">
            <Input
              value={(cfg.sheet_name as string) ?? "Sheet1"}
              onChange={(e) => set({ sheet_name: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Search column (Header)">
            <Input
              value={(cfg.search_column as string) ?? ""}
              onChange={(e) => set({ search_column: e.target.value })}
              placeholder="e.g. Phone Number"
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label="Search value">
            <Input
              value={(cfg.search_value as string) ?? ""}
              onChange={(e) => set({ search_value: e.target.value })}
              placeholder="e.g. {{contact.phone}}"
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <div className="space-y-2 border-t border-border pt-3 mt-2">
            <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              Output Mapping
            </label>
            {Object.entries((cfg.mapping as Record<string, string>) || {}).map(([col, varName], idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <Input
                  value={col}
                  onChange={(e) => {
                    const next = { ...(cfg.mapping as Record<string, string>) }
                    const val = next[col]
                    delete next[col]
                    next[e.target.value] = val
                    set({ mapping: next })
                  }}
                  placeholder="Col Header"
                  className="h-8 bg-muted text-[11px]"
                />
                <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/40" />
                <Input
                  value={varName}
                  onChange={(e) => {
                    const next = { ...(cfg.mapping as Record<string, string>) }
                    next[col] = e.target.value
                    set({ mapping: next })
                  }}
                  placeholder="var_name"
                  className="h-8 bg-muted text-[11px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground/60 hover:text-destructive"
                  onClick={() => {
                    const next = { ...(cfg.mapping as Record<string, string>) }
                    delete next[col]
                    set({ mapping: next })
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full border-dashed border-border bg-transparent text-[10px] text-muted-foreground/60 hover:bg-muted"
              onClick={() => {
                const next = { ...((cfg.mapping as Record<string, string>) || {}) }
                next["New Column"] = "new_var"
                set({ mapping: next })
              }}
            >
              <Plus className="mr-1 h-3 w-3" /> Add Mapping
            </Button>
          </div>
        </>
      )
    default:
      return null
  }
}

function FieldBlock({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-2 last:mb-0">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function previewFor(step: BuilderStep): string {
  switch (step.step_type) {
    case "send_message":
      return (step.step_config.text as string) || "no text yet"
    case "send_template":
      return (step.step_config.template_name as string) || "pick a template"
    case "whatsapp_interaction":
      return (step.step_config.body as string) || "no interaction body"
    case "whatsapp_flow":
      return `flow: ${step.step_config.flow_id ?? "?"}`
    case "trigger_automation":
      return "start another automation"
    case "assign_to_ai":
      return "generate an AI reply"
    case "wait":
      return `${step.step_config.amount ?? "?"} ${step.step_config.unit ?? ""}`
    case "condition":
      return `when ${step.step_config.subject ?? "?"}`
    case "send_webhook":
      return (step.step_config.url as string) || "no url"
    case "lookup_spreadsheet":
      return `lookup in ${step.step_config.sheet_name ?? "sheet"}`
    default:
      return ""
  }
}

// ------------------------------------------------------------
// Tree mutation helpers
// ------------------------------------------------------------

function insertAt(
  steps: BuilderStep[],
  parent: ParentScope,
  index: number,
  node: BuilderStep,
): BuilderStep[] {
  if (parent.kind === "root") {
    const copy = [...steps]
    copy.splice(index, 0, node)
    return copy
  }
  return steps.map((s) => {
    if (s.cid !== parent.parentCid || !s.branches) return s
    const list = [...s.branches[parent.branch]]
    list.splice(index, 0, node)
    return { ...s, branches: { ...s.branches, [parent.branch]: list } }
  })
}

function mapAtPath(
  steps: BuilderStep[],
  path: StepPath,
  updater: (s: BuilderStep) => BuilderStep,
): BuilderStep[] {
  if (path.length === 0) return steps
  const head = path[0]
  const rest = path.slice(1)

  if (head.kind === "root") {
    return steps.map((s, i) => {
      if (i !== head.index) return s
      return rest.length === 0
        ? updater(s)
        : { ...s, branches: walkBranches(s.branches, rest, updater) }
    })
  }
  return steps.map((s) => {
    if (s.cid !== head.parentCid || !s.branches) return s
    const bucket = s.branches[head.branch]
    const updated = bucket.map((child, i) => {
      if (i !== head.index) return child
      return rest.length === 0
        ? updater(child)
        : { ...child, branches: walkBranches(child.branches, rest, updater) }
    })
    return { ...s, branches: { ...s.branches, [head.branch]: updated } }
  })
}

function walkBranches(
  branches: BuilderStep["branches"],
  path: StepPath,
  updater: (s: BuilderStep) => BuilderStep,
): BuilderStep["branches"] {
  if (!branches) return branches
  const head = path[0]
  if (head.kind !== "branch") return branches
  const bucket = branches[head.branch]
  const rest = path.slice(1)
  const updated = bucket.map((child, i) => {
    if (i !== head.index) return child
    return rest.length === 0
      ? updater(child)
      : { ...child, branches: walkBranches(child.branches, rest, updater) }
  })
  return { ...branches, [head.branch]: updated }
}

function removeAt(steps: BuilderStep[], path: StepPath): BuilderStep[] {
  if (path.length === 0) return steps
  const head = path[0]
  const rest = path.slice(1)
  if (head.kind === "root") {
    if (rest.length === 0) return steps.filter((_, i) => i !== head.index)
    return steps.map((s, i) =>
      i !== head.index ? s : { ...s, branches: removeFromBranches(s.branches, rest) },
    )
  }
  return steps.map((s) => {
    if (s.cid !== head.parentCid || !s.branches) return s
    const bucket = s.branches[head.branch]
    const next =
      rest.length === 0
        ? bucket.filter((_, i) => i !== head.index)
        : bucket.map((child, i) =>
          i !== head.index
            ? child
            : { ...child, branches: removeFromBranches(child.branches, rest) },
        )
    return { ...s, branches: { ...s.branches, [head.branch]: next } }
  })
}

function removeFromBranches(
  branches: BuilderStep["branches"],
  path: StepPath,
): BuilderStep["branches"] {
  if (!branches) return branches
  const head = path[0]
  if (head.kind !== "branch") return branches
  const rest = path.slice(1)
  const bucket = branches[head.branch]
  const next =
    rest.length === 0
      ? bucket.filter((_, i) => i !== head.index)
      : bucket.map((child, i) =>
        i !== head.index
          ? child
          : { ...child, branches: removeFromBranches(child.branches, rest) },
      )
  return { ...branches, [head.branch]: next }
}

function moveAt(
  steps: BuilderStep[],
  path: StepPath,
  direction: -1 | 1,
): BuilderStep[] {
  if (path.length === 0) return steps
  const head = path[0]
  const rest = path.slice(1)
  const swap = <T,>(arr: T[], i: number) => {
    const j = i + direction
    if (j < 0 || j >= arr.length) return arr
    const copy = [...arr]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    return copy
  }
  if (head.kind === "root") {
    if (rest.length === 0) return swap(steps, head.index)
    return steps.map((s, i) =>
      i !== head.index ? s : { ...s, branches: moveInBranches(s.branches, rest, direction) },
    )
  }
  return steps.map((s) => {
    if (s.cid !== head.parentCid || !s.branches) return s
    const bucket = s.branches[head.branch]
    const next = rest.length === 0 ? swap(bucket, head.index) : bucket
    return { ...s, branches: { ...s.branches, [head.branch]: next } }
  })
}

function moveInBranches(
  branches: BuilderStep["branches"],
  path: StepPath,
  direction: -1 | 1,
): BuilderStep["branches"] {
  if (!branches) return branches
  const head = path[0]
  if (head.kind !== "branch") return branches
  const rest = path.slice(1)
  const bucket = branches[head.branch]
  const swap = <T,>(arr: T[], i: number) => {
    const j = i + direction
    if (j < 0 || j >= arr.length) return arr
    const copy = [...arr]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    return copy
  }
  const next = rest.length === 0 ? swap(bucket, head.index) : bucket
  return { ...branches, [head.branch]: next }
}

// ------------------------------------------------------------
// Serialize builder tree → API payload (flattened shape)
// ------------------------------------------------------------

interface ApiStep {
  step_type: string
  step_config: Record<string, unknown>
  branches?: { yes?: ApiStep[]; no?: ApiStep[] }
}

export function toApiSteps(steps: BuilderStep[]): ApiStep[] {
  return steps.map((s) => ({
    step_type: s.step_type,
    step_config: s.step_config,
    branches: s.branches
      ? { yes: toApiSteps(s.branches.yes), no: toApiSteps(s.branches.no) }
      : undefined,
  }))
}

/**
 * Convert server-returned step tree (from loadStepsTree) into the
 * builder-local shape with client ids.
 */
export interface ServerStepNode {
  id: string
  step_type: string
  step_config: Record<string, unknown>
  branches: { yes: ServerStepNode[]; no: ServerStepNode[] }
}

export function fromServerSteps(nodes: ServerStepNode[]): BuilderStep[] {
  return nodes.map((n) => ({
    cid: cid(),
    step_type: n.step_type as AutomationStepType,
    step_config: n.step_config ?? {},
    branches:
      n.step_type === "condition"
        ? {
          yes: fromServerSteps(n.branches?.yes ?? []),
          no: fromServerSteps(n.branches?.no ?? []),
        }
        : undefined,
  }))
}
