"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  Layers,
  Smartphone,
  FolderTree,
  Search,
  Check,
  CheckCheck,
  CornerDownRight,
  AlertCircle,
  ArrowRight,
  MenuSquare,
  FileQuestion,
  RefreshCw,
  GitFork,
  RotateCcw,
  Split,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowNode, NodeOption, WorkflowNodeType } from "@/types";

interface NodeBuilderProps {
  initialNodes?: WorkflowNode[];
}

interface SimulationStep {
  node: WorkflowNode;
  chosenOption?: NodeOption;
}

export function NodeBuilderScreen({ initialNodes = [] }: NodeBuilderProps) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "flow">("tree");

  // Editing / Creating Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formNodeKey, setFormNodeKey] = useState("");
  const [formNodeType, setFormNodeType] = useState<WorkflowNodeType>("menu");
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formParentOptionId, setFormParentOptionId] = useState<string | null>(null);
  const [formLevel, setFormLevel] = useState<number>(1);
  const [formHeaderText, setFormHeaderText] = useState("");
  const [formBodyText, setFormBodyText] = useState("");
  const [formFooterText, setFormFooterText] = useState("");
  const [formOptions, setFormOptions] = useState<
    Array<{
      id?: string;
      option_id: string;
      label: string;
      description?: string;
      next_node_id?: string | null;
      is_correct_answer: boolean;
      points: number;
    }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active preview node & simulation history
  const [previewNode, setPreviewNode] = useState<WorkflowNode | null>(null);
  const [simulationTrail, setSimulationTrail] = useState<SimulationStep[]>([]);
  const [simulatedScore, setSimulatedScore] = useState<number>(0);
  const [previewListOpen, setPreviewListOpen] = useState(false);

  // Load nodes from API
  const fetchNodes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflow-nodes");
      if (res.ok) {
        const data = await res.json();
        const loaded: WorkflowNode[] = data.nodes || [];
        setNodes(loaded);

        // Auto-expand all root nodes
        const rootIds = new Set(loaded.filter((n) => !n.parent_node_id || n.level === 1).map((n) => n.id));
        setExpandedNodeIds(rootIds);

        // Set initial preview node if none selected
        if (!previewNode && loaded.length > 0) {
          const root = loaded.find((n) => n.level === 1) || loaded[0];
          setPreviewNode(root);
          setSimulationTrail([{ node: root }]);
        } else if (previewNode) {
          const fresh = loaded.find((n) => n.id === previewNode.id);
          if (fresh) setPreviewNode(fresh);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Failed to load workflow nodes:", res.status, errData);
      }
    } catch (err) {
      console.error("Failed to load workflow nodes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  // Build hierarchical tree structure and option-to-child map
  const { tree, nodeMap, incomingOptionMap } = useMemo(() => {
    const map = new Map<string, WorkflowNode>();
    nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));

    // Map next_node_id to the parent's option that triggers it
    const optionRoutingMap = new Map<string, { parentTitle: string; optionLabel: string }>();
    nodes.forEach((parent) => {
      (parent.options || []).forEach((opt) => {
        if (opt.next_node_id) {
          optionRoutingMap.set(opt.next_node_id, {
            parentTitle: parent.title,
            optionLabel: opt.label,
          });
        }
      });
    });

    const roots: WorkflowNode[] = [];
    nodes.forEach((n) => {
      const current = map.get(n.id)!;
      if (n.parent_node_id && map.has(n.parent_node_id)) {
        map.get(n.parent_node_id)!.children?.push(current);
      } else {
        roots.push(current);
      }
    });

    return { tree: roots, nodeMap: map, incomingOptionMap: optionRoutingMap };
  }, [nodes]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (selectedLevel !== null) {
      result = result.filter((n) => n.level === selectedLevel);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.node_key.toLowerCase().includes(q) ||
          n.body_text.toLowerCase().includes(q) ||
          n.options?.some((o) => o.label.toLowerCase().includes(q))
      );
    }
    return result;
  }, [nodes, selectedLevel, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Reset WhatsApp simulator
  const resetSimulation = (startNode?: WorkflowNode) => {
    const target = startNode || nodes.find((n) => n.level === 1) || nodes[0] || null;
    setPreviewNode(target);
    setSimulationTrail(target ? [{ node: target }] : []);
    setSimulatedScore(0);
    setPreviewListOpen(false);
  };

  // User clicks an option inside the WhatsApp preview
  const handleSimulateClickOption = (opt: NodeOption) => {
    if (!previewNode) return;

    const points = opt.is_correct_answer ? (opt.points || 10) : 0;
    const nextScore = simulatedScore + points;
    setSimulatedScore(nextScore);

    if (opt.next_node_id && nodeMap.has(opt.next_node_id)) {
      const nextNode = nodeMap.get(opt.next_node_id)!;
      setPreviewNode(nextNode);
      setSimulationTrail((prev) => [...prev, { node: nextNode, chosenOption: opt }]);
      setPreviewListOpen(false);
    } else {
      // Terminal node
      setPreviewListOpen(false);
    }
  };

  // Open modal to create a new node
  const handleOpenCreate = (parentId: string | null = null, parentOptionId: string | null = null) => {
    setEditingNode(null);
    setErrorMessage(null);
    setFormParentId(parentId);
    setFormParentOptionId(parentOptionId);

    const parentNode = parentId ? nodeMap.get(parentId) : null;
    const parentOpt = parentNode && parentOptionId ? parentNode.options?.find((o) => o.id === parentOptionId || o.option_id === parentOptionId) : null;

    if (parentOpt) {
      setFormTitle(`${parentOpt.label} - Next Screen`);
      setFormNodeKey(`${parentOpt.label.toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 20)}_flow`);
    } else {
      setFormTitle("");
      setFormNodeKey("");
    }

    setFormNodeType("menu");

    if (parentId && nodeMap.has(parentId)) {
      const parent = nodeMap.get(parentId)!;
      setFormLevel(Math.min(5, (parent.level || 1) + 1));
    } else {
      setFormLevel(1);
    }

    setFormHeaderText("");
    setFormBodyText("");
    setFormFooterText("");
    setFormOptions([
      {
        option_id: "opt_1",
        label: "Choice 1",
        is_correct_answer: false,
        points: 0,
        next_node_id: null,
      },
    ]);
    setIsModalOpen(true);
  };

  // Open modal to edit an existing node
  const handleOpenEdit = (node: WorkflowNode) => {
    setEditingNode(node);
    setErrorMessage(null);
    setFormTitle(node.title);
    setFormNodeKey(node.node_key);
    setFormNodeType(node.node_type);
    setFormParentId(node.parent_node_id || null);
    setFormParentOptionId(null);
    setFormLevel(node.level || 1);
    setFormHeaderText(node.header_text || "");
    setFormBodyText(node.body_text || "");
    setFormFooterText(node.footer_text || "");

    const existingOpts = (node.options || []).map((o) => ({
      id: o.id,
      option_id: o.option_id,
      label: o.label,
      description: o.description || "",
      next_node_id: o.next_node_id || null,
      is_correct_answer: Boolean(o.is_correct_answer),
      points: o.points || 0,
    }));

    setFormOptions(
      existingOpts.length > 0
        ? existingOpts
        : [
            {
              option_id: "opt_1",
              label: "Choice 1",
              is_correct_answer: false,
              points: 0,
              next_node_id: null,
            },
          ]
    );
    setIsModalOpen(true);
  };

  // Delete node
  const handleDeleteNode = async (id: string) => {
    if (!confirm("Are you sure you want to delete this node? All options and child links will be removed.")) {
      return;
    }

    try {
      const res = await fetch(`/api/workflow-nodes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNodes((prev) => prev.filter((n) => n.id !== id));
        if (previewNode?.id === id) {
          setPreviewNode(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete node:", err);
    }
  };

  // Add an option to form
  const handleAddOption = () => {
    if (formOptions.length >= 10) return;
    const nextIdx = formOptions.length + 1;
    setFormOptions((prev) => [
      ...prev,
      {
        option_id: `opt_${nextIdx}`,
        label: `Choice ${nextIdx}`,
        is_correct_answer: false,
        points: formNodeType === "question" ? 10 : 0,
        next_node_id: null,
      },
    ]);
  };

  // Remove option from form
  const handleRemoveOption = (index: number) => {
    setFormOptions((prev) => prev.filter((_, i) => i !== index));
  };

  // Save node (POST or PATCH)
  const handleSaveNode = async () => {
    setErrorMessage(null);

    if (!formTitle.trim()) {
      setErrorMessage("Please enter a title for the node.");
      return;
    }
    if (!formBodyText.trim()) {
      setErrorMessage("Please enter the WhatsApp message body text.");
      return;
    }

    // Validation for WhatsApp interactive limits
    const isButtons = formOptions.length <= 3;
    const maxChars = isButtons ? 20 : 24;

    for (let i = 0; i < formOptions.length; i++) {
      const opt = formOptions[i];
      if (!opt.label.trim()) {
        setErrorMessage(`Choice ${i + 1} requires a label.`);
        return;
      }
      if (opt.label.trim().length > maxChars) {
        setErrorMessage(
          `Choice "${opt.label}" exceeds Meta limit of ${maxChars} characters for ${
            isButtons ? "Quick Reply Buttons" : "List Menu items"
          }.`
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        node_key: formNodeKey.trim() || undefined,
        node_type: formNodeType,
        parent_node_id: formParentId || null,
        parent_option_id: formParentOptionId || undefined,
        level: formLevel,
        header_text: formHeaderText.trim() || null,
        body_text: formBodyText.trim(),
        footer_text: formFooterText.trim() || null,
        options: formOptions.map((o, idx) => ({
          option_id: o.option_id.trim() || `opt_${idx + 1}`,
          label: o.label.trim(),
          description: o.description?.trim() || null,
          next_node_id: o.next_node_id || null,
          is_correct_answer: o.is_correct_answer,
          points: Number(o.points) || 0,
          position: idx,
        })),
      };

      const url = editingNode ? `/api/workflow-nodes/${editingNode.id}` : "/api/workflow-nodes";
      const method = editingNode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to save node");
        setIsSaving(false);
        return;
      }

      await fetchNodes();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Type badge styling
  const getTypeBadge = (type: WorkflowNodeType) => {
    switch (type) {
      case "menu":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/30">Menu</Badge>;
      case "question":
        return <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border-purple-500/30">Quiz Question</Badge>;
      case "form":
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30">Form</Badge>;
      case "action":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30">Action</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Recursive Tree Node Item Component with visible Branch Routing
  const renderTreeNode = (node: WorkflowNode, depth = 0) => {
    const isExpanded = expandedNodeIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = previewNode?.id === node.id;
    const isButtons = (node.options?.length || 0) <= 3;
    const incomingTrigger = incomingOptionMap.get(node.id);

    return (
      <div key={node.id} className="space-y-1.5">
        <div
          onClick={() => {
            setPreviewNode(node);
            setSimulationTrail([{ node }]);
            setSimulatedScore(0);
          }}
          className={`group flex flex-col p-3 rounded-lg border transition-all cursor-pointer ${
            isSelected
              ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
              : "bg-card hover:bg-muted/40 border-border"
          }`}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          {/* Incoming trigger badge if this node was branched from an option */}
          {incomingTrigger && (
            <div className="mb-1.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CornerDownRight className="h-3.5 w-3.5" />
              <span>Triggered when user selects:</span>
              <span className="font-bold underline decoration-emerald-500/40">
                &ldquo;{incomingTrigger.optionLabel}&rdquo;
              </span>
              <span className="text-muted-foreground text-[10px]">from {incomingTrigger.parentTitle}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(node.id);
                  }}
                  className="p-1 hover:bg-muted rounded text-muted-foreground shrink-0"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <div className="w-6 flex items-center justify-center shrink-0">
                  <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              )}

              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="font-bold text-sm text-foreground">{node.title}</span>
                <span className="text-xs text-muted-foreground font-mono">({node.node_key})</span>
              </div>

              <div className="flex items-center gap-1.5 ml-1">
                {getTypeBadge(node.node_type)}
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                  Level {node.level}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {node.options?.length || 0} {isButtons ? "Buttons" : "List Items"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenCreate(node.id);
                }}
                className="h-7 text-xs px-2 gap-1"
                title="Add a subscreen/question under this node"
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Add Screen</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(node);
                }}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Edit Node"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(node.id);
                }}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                title="Delete Node"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Body snippet */}
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1 pl-8">
            &ldquo;{node.body_text}&rdquo;
          </p>

          {/* VISIBLE BRANCHING ROUTES: Show where each option leads */}
          {node.options && node.options.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-border/60 pl-8 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 flex items-center gap-1">
                <Split className="h-3 w-3 text-primary" />
                Branch Routes (Selecting an option routes here):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {node.options.map((opt, idx) => {
                  const targetNode = opt.next_node_id ? nodeMap.get(opt.next_node_id) : null;

                  return (
                    <div
                      key={opt.id || idx}
                      className={`text-xs p-1.5 rounded border flex items-center justify-between gap-1.5 ${
                        targetNode
                          ? "bg-muted/30 border-border"
                          : "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-foreground">
                          {opt.label}
                        </span>
                        {opt.is_correct_answer && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            (+{opt.points || 10} pts)
                          </span>
                        )}
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        {targetNode ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewNode(targetNode);
                            }}
                            className="font-medium text-primary hover:underline truncate"
                          >
                            {targetNode.title} (Lvl {targetNode.level})
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            Ends Flow
                          </span>
                        )}
                      </div>

                      {/* Shortcut to create next screen for this option if unlinked */}
                      {!targetNode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreate(node.id, opt.id || opt.option_id);
                          }}
                          className="h-5 text-[10px] px-1.5 text-primary hover:bg-primary/10"
                        >
                          + Create Screen
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Render child nodes if expanded */}
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-border/60 ml-4 pl-1 space-y-2">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Branching Flow Map Component (Visual comparison of choices)
  const renderFlowMap = () => {
    const rootNodes = nodes.filter((n) => !n.parent_node_id || n.level === 1);

    if (rootNodes.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
          No root screens yet. Create a Level 1 Root Menu to begin mapping branches.
        </div>
      );
    }

    return (
      <div className="space-y-6 overflow-x-auto pb-4">
        {rootNodes.map((root) => (
          <div key={root.id} className="p-4 rounded-xl border border-border bg-card space-y-4">
            {/* Level 1 Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground text-xs">Level 1: Entry Menu</Badge>
                <h3 className="font-bold text-foreground text-sm">{root.title}</h3>
                <span className="text-xs text-muted-foreground font-mono">({root.node_key})</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(root)}
                className="h-7 text-xs"
              >
                Edit Root
              </Button>
            </div>

            {/* Branching Columns: Option A vs Option B */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(root.options || []).map((opt, idx) => {
                const targetNode = opt.next_node_id ? nodeMap.get(opt.next_node_id) : null;
                const nextOptions = targetNode?.options || [];

                return (
                  <div
                    key={opt.id || idx}
                    className="flex flex-col p-3 rounded-lg border border-border bg-muted/20 space-y-3 relative"
                  >
                    {/* Choice Trigger Banner */}
                    <div className="bg-background p-2 rounded-md border border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-foreground truncate">
                          &ldquo;{opt.label}&rdquo;
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Branch {idx + 1}
                      </Badge>
                    </div>

                    {/* Downstream Destination */}
                    <div className="flex-1 flex flex-col justify-between">
                      {targetNode ? (
                        <div
                          onClick={() => {
                            setPreviewNode(targetNode);
                            setSimulationTrail([{ node: root }, { node: targetNode, chosenOption: opt }]);
                          }}
                          className="p-2.5 rounded-lg border border-primary/30 bg-card hover:border-primary cursor-pointer transition-all space-y-1.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{targetNode.title}</span>
                            {getTypeBadge(targetNode.node_type)}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {targetNode.body_text}
                          </p>

                          {/* Subsequent sub-questions */}
                          {nextOptions.length > 0 && (
                            <div className="pt-2 border-t border-border/50 space-y-1">
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                Sub-choices ({nextOptions.length}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {nextOptions.map((subOpt) => (
                                  <span
                                    key={subOpt.id || subOpt.option_id}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                  >
                                    {subOpt.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg border border-dashed border-border text-center space-y-2 bg-background/50">
                          <p className="text-xs text-muted-foreground">
                            Option &ldquo;{opt.label}&rdquo; has no linked screen yet.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCreate(root.id, opt.id || opt.option_id)}
                            className="text-xs h-7 gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Create Screen for this Choice
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderTree className="h-6 w-6 text-primary" />
            Interactive Menu & Assessment Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build multi-level WhatsApp menus and quizzes where selecting choice A branches to different questions than choice B.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchNodes} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => handleOpenCreate(null)} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            New Root Menu
          </Button>
        </div>
      </div>

      {/* Breadcrumbs, View Switcher, and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-background">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewMode === "tree" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderTree className="h-3.5 w-3.5" /> Tree View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flow")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewMode === "flow" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitFork className="h-3.5 w-3.5" /> Branching Flow Map
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 ml-2">
            <Button
              variant={selectedLevel === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLevel(null)}
              className="h-7 text-xs rounded-full"
            >
              All Levels ({nodes.length})
            </Button>
            <Button
              variant={selectedLevel === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLevel(1)}
              className="h-7 text-xs rounded-full gap-1"
            >
              <Layers className="h-3 w-3" />
              Level 1 ({nodes.filter((n) => n.level === 1).length})
            </Button>
            <Button
              variant={selectedLevel === 2 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLevel(2)}
              className="h-7 text-xs rounded-full gap-1"
            >
              <MenuSquare className="h-3 w-3" />
              Level 2 ({nodes.filter((n) => n.level === 2).length})
            </Button>
            <Button
              variant={selectedLevel === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLevel(3)}
              className="h-7 text-xs rounded-full gap-1"
            >
              <FileQuestion className="h-3 w-3" />
              Level 3+ ({nodes.filter((n) => n.level >= 3).length})
            </Button>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search screens, choices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Main Split Layout: Left Content (Tree or Flow) + Right WhatsApp Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Area (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg border-border">
              <RefreshCw className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading workflow nodes...</p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg border-border bg-card">
              <FolderTree className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-foreground">No workflow screens found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Get started by creating your Level 1 Root Screen (e.g. Class Selection, Track Chooser).
              </p>
              <Button onClick={() => handleOpenCreate(null)} size="sm" className="mt-4 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create Root Menu
              </Button>
            </div>
          ) : viewMode === "flow" ? (
            renderFlowMap()
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1">
                <span>Displaying {filteredNodes.length} workflow screen(s)</span>
                <span>Click any screen to preview in WhatsApp simulator</span>
              </div>
              <div className="space-y-2.5">
                {selectedLevel === null && !searchQuery.trim()
                  ? tree.map((root) => renderTreeNode(root))
                  : filteredNodes.map((n) => renderTreeNode(n))}
              </div>
            </div>
          )}
        </div>

        {/* Right Area: Interactive WhatsApp Simulator with Live Customer Journey Trail */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Interactive Simulation
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetSimulation()}
              className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Restart Flow
            </Button>
          </div>

          {/* Customer Journey Trail Indicator */}
          {simulationTrail.length > 0 && (
            <div className="bg-muted/40 border border-border rounded-lg p-2 text-xs space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Simulated Customer Path:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {simulationTrail.map((step, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <span className="text-muted-foreground/60 text-[10px] flex items-center gap-0.5 font-semibold">
                        <ArrowRight className="h-3 w-3 text-emerald-500" />
                        &ldquo;{step.chosenOption?.label}&rdquo; ➔
                      </span>
                    )}
                    <span
                      onClick={() => setPreviewNode(step.node)}
                      className={`px-2 py-0.5 rounded cursor-pointer text-[11px] font-medium border ${
                        previewNode?.id === step.node.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {step.node.title}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              {simulatedScore > 0 && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                  Current Score: {simulatedScore} points
                </p>
              )}
            </div>
          )}

          {/* Smartphone Frame */}
          <div className="w-full max-w-sm mx-auto rounded-[2.5rem] p-3.5 bg-neutral-900 shadow-2xl border-4 border-neutral-700/60">
            <div className="rounded-[2rem] overflow-hidden bg-[#0b141a] text-neutral-100 flex flex-col h-[520px] relative border border-neutral-800">
              {/* WhatsApp Top Bar */}
              <div className="bg-[#202c33] px-3.5 py-2.5 flex items-center justify-between border-b border-neutral-700/50">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                    HC
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-none text-white">HopeChat Assistant</p>
                    <p className="text-[10px] text-emerald-400 leading-tight mt-0.5">Online</p>
                  </div>
                </div>
                {previewNode && (
                  <Badge variant="outline" className="text-[9px] border-neutral-700 text-neutral-300">
                    Lvl {previewNode.level}
                  </Badge>
                )}
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0b141a] bg-opacity-95 text-xs">
                <div className="text-center">
                  <span className="text-[10px] bg-[#182229] text-neutral-400 px-2 py-0.5 rounded shadow-sm">
                    TODAY
                  </span>
                </div>

                {previewNode ? (
                  <div className="space-y-1.5 max-w-[90%]">
                    {/* Message Bubble */}
                    <div className="bg-[#005c4b] text-neutral-100 rounded-lg p-2.5 shadow space-y-1 relative">
                      {previewNode.header_text && (
                        <p className="font-bold text-[11px] text-white border-b border-emerald-700/60 pb-1">
                          {previewNode.header_text}
                        </p>
                      )}

                      <p className="whitespace-pre-wrap leading-relaxed text-xs">
                        {previewNode.body_text}
                      </p>

                      {previewNode.footer_text && (
                        <p className="text-[10px] text-neutral-300/80 pt-0.5 italic">
                          {previewNode.footer_text}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1 text-[9px] text-neutral-300/80 mt-1">
                        <span>10:45 AM</span>
                        <CheckCheck className="h-3 w-3 text-sky-400" />
                      </div>
                    </div>

                    {/* Interactive Choices (Click to advance in simulator) */}
                    {previewNode.options && previewNode.options.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        <p className="text-[9px] text-neutral-400 italic px-1">
                          👉 Tap a choice below to simulate customer branch:
                        </p>

                        {previewNode.options.length <= 3 ? (
                          previewNode.options.map((opt) => (
                            <button
                              key={opt.option_id}
                              type="button"
                              onClick={() => handleSimulateClickOption(opt)}
                              className="w-full py-1.5 px-3 bg-[#202c33] hover:bg-[#2a3942] active:bg-[#111b21] text-sky-400 text-center font-medium rounded-md shadow-sm border border-neutral-700/40 text-[11px] transition-colors flex items-center justify-between gap-1.5"
                            >
                              <span className="truncate">{opt.label}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {opt.is_correct_answer && (
                                  <span className="text-[9px] text-emerald-400 font-bold">
                                    +{opt.points || 10} pts
                                  </span>
                                )}
                                {opt.next_node_id ? (
                                  <ArrowRight className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <span className="text-[9px] text-neutral-500">End</span>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div>
                            <button
                              type="button"
                              onClick={() => setPreviewListOpen(!previewListOpen)}
                              className="w-full py-2 px-3 bg-[#202c33] hover:bg-[#2a3942] text-sky-400 text-center font-medium rounded-md shadow-sm border border-neutral-700/40 text-xs flex items-center justify-center gap-1.5"
                            >
                              <MenuSquare className="h-3 w-3" />
                              <span>Select Option ({previewNode.options.length})</span>
                            </button>

                            {previewListOpen && (
                              <div className="mt-2 bg-[#202c33] rounded-lg border border-neutral-700 p-2 space-y-1 shadow-lg max-h-48 overflow-y-auto">
                                <p className="text-[10px] uppercase font-bold text-neutral-400 px-1">
                                  Menu Options
                                </p>
                                {previewNode.options.map((opt) => (
                                  <div
                                    key={opt.option_id}
                                    onClick={() => handleSimulateClickOption(opt)}
                                    className="p-1.5 rounded hover:bg-[#2a3942] cursor-pointer text-[11px] flex items-center justify-between text-neutral-200"
                                  >
                                    <div>
                                      <p className="font-medium text-white">{opt.label}</p>
                                      {opt.description && (
                                        <p className="text-[9px] text-neutral-400">{opt.description}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {opt.is_correct_answer && (
                                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] h-4">
                                          Correct
                                        </Badge>
                                      )}
                                      {opt.next_node_id && (
                                        <ArrowRight className="h-3 w-3 text-emerald-400" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 text-xs p-4">
                    <Smartphone className="h-8 w-8 text-neutral-600 mb-2" />
                    <p>Select any screen from the tree to simulate branching.</p>
                  </div>
                )}
              </div>

              {/* Bottom Input Area */}
              <div className="bg-[#202c33] p-2 flex items-center gap-2 border-t border-neutral-700/50">
                <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-neutral-400">
                  Type a message
                </div>
                <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                  <Check className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingNode ? <Edit2 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              {editingNode ? "Edit Workflow Screen" : "Create New Workflow Screen"}
            </DialogTitle>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Screen Title *</label>
                <Input
                  placeholder="e.g., Biology Quiz Q1 or Main Menu"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (!editingNode && !formNodeKey) {
                      setFormNodeKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 30));
                    }
                  }}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Unique Screen Key *</label>
                <Input
                  placeholder="e.g., olevel_bio_q1"
                  value={formNodeKey}
                  onChange={(e) => setFormNodeKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, "_"))}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Screen Type</label>
                <Select value={formNodeType} onValueChange={(val) => setFormNodeType(val as WorkflowNodeType)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="menu">Menu (Navigation)</SelectItem>
                    <SelectItem value="question">Question (Assessment/Quiz)</SelectItem>
                    <SelectItem value="form">Form (Collect Data)</SelectItem>
                    <SelectItem value="action">Action (Execute Task)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Parent Screen</label>
                <Select
                  value={formParentId || "none"}
                  onValueChange={(val) => {
                    const pid = val === "none" ? null : val;
                    setFormParentId(pid);
                    if (pid && nodeMap.has(pid)) {
                      setFormLevel(Math.min(5, (nodeMap.get(pid)!.level || 1) + 1));
                    } else {
                      setFormLevel(1);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Root (No parent)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Level 1 Screen)</SelectItem>
                    {nodes
                      .filter((n) => !editingNode || n.id !== editingNode.id)
                      .map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          Level {n.level}: {n.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Hierarchy Level</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formLevel}
                  onChange={(e) => setFormLevel(parseInt(e.target.value, 10) || 1)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Message Content */}
            <div className="border-t border-border pt-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                WhatsApp Message Bubble
              </h4>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="font-semibold text-foreground">Header Text (Optional)</label>
                  <span className="text-muted-foreground text-[10px]">{formHeaderText.length}/60</span>
                </div>
                <Input
                  placeholder="e.g., HOPECHAT ACADEMY"
                  value={formHeaderText}
                  maxLength={60}
                  onChange={(e) => setFormHeaderText(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="font-semibold text-foreground">Message Body Text *</label>
                  <span className="text-muted-foreground text-[10px]">{formBodyText.length}/1024</span>
                </div>
                <Textarea
                  placeholder="e.g., Welcome! Please select which track you would like to take today:"
                  value={formBodyText}
                  maxLength={1024}
                  rows={3}
                  onChange={(e) => setFormBodyText(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="font-semibold text-foreground">Footer Text (Optional)</label>
                  <span className="text-muted-foreground text-[10px]">{formFooterText.length}/60</span>
                </div>
                <Input
                  placeholder="e.g., Tap an option below to proceed"
                  value={formFooterText}
                  maxLength={60}
                  onChange={(e) => setFormFooterText(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Options / Choices / Branch Destinations */}
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Choices & Branch Destinations ({formOptions.length}/10)
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {formOptions.length <= 3
                      ? "1–3 items render as WhatsApp Quick Reply Buttons (max 20 chars per label)."
                      : "4–10 items render as an Interactive List Menu (max 24 chars per label)."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={formOptions.length >= 10}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Choice
                </Button>
              </div>

              {/* Fast Link for Quizzes / Sequential Questions */}
              {formNodeType === "question" && formOptions.length > 1 && (
                <div className="flex items-center gap-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-md text-xs">
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 shrink-0">
                    Next Question for all choices:
                  </span>
                  <Select
                    onValueChange={(val) => {
                      const nextId: string | null = !val || val === "end" ? null : String(val);
                      const updated = formOptions.map((opt) => ({
                        ...opt,
                        next_node_id: nextId,
                      }));
                      setFormOptions(updated);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs bg-background flex-1">
                      <SelectValue placeholder="Apply next question to all..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end">None (Quiz Finishes)</SelectItem>
                      {nodes
                        .filter((n) => !editingNode || n.id !== editingNode.id)
                        .map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            Level {n.level}: {n.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                {formOptions.map((opt, idx) => {
                  const maxChar = formOptions.length <= 3 ? 20 : 24;
                  const isOverLimit = opt.label.length > maxChar;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs space-y-2.5 ${
                        isOverLimit ? "border-destructive bg-destructive/5" : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-muted-foreground w-5 text-center">{idx + 1}.</span>
                        <div className="flex-1">
                          <Input
                            placeholder={`Choice Label (e.g., Track A: Biology)`}
                            value={opt.label}
                            onChange={(e) => {
                              const updated = [...formOptions];
                              updated[idx].label = e.target.value;
                              setFormOptions(updated);
                            }}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="w-28">
                          <Input
                            placeholder="ID (opt_1)"
                            value={opt.option_id}
                            onChange={(e) => {
                              const updated = [...formOptions];
                              updated[idx].option_id = e.target.value;
                              setFormOptions(updated);
                            }}
                            className="h-8 text-xs font-mono bg-background"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(idx)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                        <div>
                          <label className="text-[10px] font-semibold text-primary flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            Route to Next Screen when clicked:
                          </label>
                          <Select
                            value={opt.next_node_id || "end"}
                            onValueChange={(val) => {
                              const updated = [...formOptions];
                              updated[idx].next_node_id = val === "end" ? null : val;
                              setFormOptions(updated);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background mt-1">
                              <SelectValue placeholder="Select destination screen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="end">None (End of flow)</SelectItem>
                              {nodes
                                .filter((n) => !editingNode || n.id !== editingNode.id)
                                .map((n) => (
                                  <SelectItem key={n.id} value={n.id}>
                                    Level {n.level}: {n.title}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* If Question node: allow marking correct answer and points */}
                        {formNodeType === "question" && (
                          <div className="flex items-center gap-3 pt-4">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px]">
                              <input
                                type="checkbox"
                                checked={opt.is_correct_answer}
                                onChange={(e) => {
                                  const updated = [...formOptions];
                                  updated[idx].is_correct_answer = e.target.checked;
                                  if (e.target.checked && updated[idx].points === 0) {
                                    updated[idx].points = 10;
                                  }
                                  setFormOptions(updated);
                                }}
                                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Correct Answer
                              </span>
                            </label>

                            {opt.is_correct_answer && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">Pts:</span>
                                <Input
                                  type="number"
                                  value={opt.points}
                                  onChange={(e) => {
                                    const updated = [...formOptions];
                                    updated[idx].points = parseInt(e.target.value, 10) || 0;
                                    setFormOptions(updated);
                                  }}
                                  className="h-7 w-16 text-xs p-1 text-center bg-background"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {isOverLimit && (
                        <p className="text-[10px] text-destructive pl-7">
                          Label has {opt.label.length} characters (Meta limit is {maxChar} chars).
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSaveNode} disabled={isSaving} size="sm">
              {isSaving ? "Saving..." : editingNode ? "Update Screen" : "Create Screen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
