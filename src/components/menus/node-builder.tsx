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
  CheckCircle2,
  HelpCircle,
  FolderTree,
  Search,
  Check,
  CheckCheck,
  CornerDownRight,
  AlertCircle,
  Sparkles,
  ArrowRight,
  MenuSquare,
  ListFilter,
  FileQuestion,
  FileText,
  X,
  RefreshCw,
  Info,
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

export function NodeBuilderScreen({ initialNodes = [] }: NodeBuilderProps) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // Editing / Creating Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formNodeKey, setFormNodeKey] = useState("");
  const [formNodeType, setFormNodeType] = useState<WorkflowNodeType>("menu");
  const [formParentId, setFormParentId] = useState<string | null>(null);
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

  // Active preview node
  const [previewNode, setPreviewNode] = useState<WorkflowNode | null>(null);
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
          setPreviewNode(loaded[0]);
        } else if (previewNode) {
          const fresh = loaded.find((n) => n.id === previewNode.id);
          if (fresh) setPreviewNode(fresh);
        }
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

  // Build hierarchical tree structure
  const { tree, nodeMap } = useMemo(() => {
    const map = new Map<string, WorkflowNode>();
    nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));

    const roots: WorkflowNode[] = [];
    nodes.forEach((n) => {
      const current = map.get(n.id)!;
      if (n.parent_node_id && map.has(n.parent_node_id)) {
        map.get(n.parent_node_id)!.children?.push(current);
      } else {
        roots.push(current);
      }
    });

    return { tree: roots, nodeMap: map };
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
          n.body_text.toLowerCase().includes(q)
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

  // Open modal to create a new node
  const handleOpenCreate = (parentId: string | null = null) => {
    setEditingNode(null);
    setErrorMessage(null);
    setFormTitle("");
    setFormNodeKey("");
    setFormNodeType("menu");
    setFormParentId(parentId);

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
        label: "Option 1",
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
              label: "Option 1",
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
        label: `Option ${nextIdx}`,
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
        setErrorMessage(`Option ${i + 1} requires a label.`);
        return;
      }
      if (opt.label.trim().length > maxChars) {
        setErrorMessage(
          `Option "${opt.label}" exceeds Meta limit of ${maxChars} characters for ${
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

      const savedNode: WorkflowNode = data.node;

      setNodes((prev) => {
        if (editingNode) {
          return prev.map((n) => (n.id === savedNode.id ? savedNode : n));
        } else {
          return [savedNode, ...prev];
        }
      });

      // Update preview node
      setPreviewNode(savedNode);

      // Auto-expand parent if created child
      if (savedNode.parent_node_id) {
        setExpandedNodeIds((prev) => new Set([...prev, savedNode.parent_node_id!]));
      }

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

  // Recursive Tree Node Item Component
  const renderTreeNode = (node: WorkflowNode, depth = 0) => {
    const isExpanded = expandedNodeIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = previewNode?.id === node.id;
    const isButtons = (node.options?.length || 0) <= 3;

    return (
      <div key={node.id} className="space-y-1">
        <div
          onClick={() => setPreviewNode(node)}
          className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
            isSelected
              ? "bg-primary/5 border-primary shadow-sm"
              : "bg-card hover:bg-muted/50 border-border"
          }`}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="p-1 hover:bg-muted rounded text-muted-foreground"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <div className="w-6 flex items-center justify-center">
                <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm text-foreground truncate">{node.title}</span>
              <span className="text-xs text-muted-foreground font-mono truncate">({node.node_key})</span>
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              {getTypeBadge(node.node_type)}
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                Lvl {node.level}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {node.options?.length || 0} {isButtons ? "Buttons" : "List Items"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCreate(node.id);
              }}
              className="h-7 text-xs px-2 gap-1"
              title="Add a child screen/question under this node"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Add Child</span>
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

        {/* Render child nodes if expanded */}
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-border/50 ml-3 pl-1 space-y-1">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderTree className="h-6 w-6 text-primary" />
            Interactive Menu & Assessment Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visually create nested WhatsApp menus, assessment question banks, and multi-screen customer flows.
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

      {/* Breadcrumb / Level Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
            <ListFilter className="h-3.5 w-3.5" /> Levels:
          </span>
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
            Level 1: Root / Entry ({nodes.filter((n) => n.level === 1).length})
          </Button>
          <Button
            variant={selectedLevel === 2 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLevel(2)}
            className="h-7 text-xs rounded-full gap-1"
          >
            <MenuSquare className="h-3 w-3" />
            Level 2: Sub-Menus / Catalogs ({nodes.filter((n) => n.level === 2).length})
          </Button>
          <Button
            variant={selectedLevel === 3 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLevel(3)}
            className="h-7 text-xs rounded-full gap-1"
          >
            <FileQuestion className="h-3 w-3" />
            Level 3+: Questions & Actions ({nodes.filter((n) => n.level >= 3).length})
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search nodes or keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Main Content Split: Tree View + WhatsApp Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Tree View Area (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg border-border">
              <RefreshCw className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading workflow nodes...</p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg border-border bg-card">
              <FolderTree className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-foreground">No workflow nodes found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Get started by creating your first WhatsApp root screen or interactive quiz question.
              </p>
              <Button onClick={() => handleOpenCreate(null)} size="sm" className="mt-4 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create Root Menu
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1">
                <span>Displaying {filteredNodes.length} workflow node(s)</span>
                <span>Click a node to preview in WhatsApp simulator</span>
              </div>
              <div className="space-y-2">
                {selectedLevel === null && !searchQuery.trim()
                  ? tree.map((root) => renderTreeNode(root))
                  : filteredNodes.map((n) => renderTreeNode(n))}
              </div>
            </div>
          )}
        </div>

        {/* Right / WhatsApp Simulator Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              WhatsApp Live Simulator
            </span>
            {previewNode && (
              <Badge variant="outline" className="text-[10px]">
                {previewNode.node_key}
              </Badge>
            )}
          </div>

          {/* Smartphone Frame */}
          <div className="w-full max-w-sm mx-auto rounded-[2.5rem] p-3.5 bg-neutral-900 shadow-2xl border-4 border-neutral-700/60">
            {/* Phone Screen */}
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
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0b141a] bg-opacity-95 text-xs">
                {/* Date separator */}
                <div className="text-center">
                  <span className="text-[10px] bg-[#182229] text-neutral-400 px-2 py-0.5 rounded shadow-sm">
                    TODAY
                  </span>
                </div>

                {previewNode ? (
                  <div className="space-y-1.5 max-w-[88%]">
                    {/* Message Bubble */}
                    <div className="bg-[#005c4b] text-neutral-100 rounded-lg p-2.5 shadow space-y-1 relative">
                      {/* Header */}
                      {previewNode.header_text && (
                        <p className="font-bold text-[11px] text-white border-b border-emerald-700/60 pb-1">
                          {previewNode.header_text}
                        </p>
                      )}

                      {/* Body */}
                      <p className="whitespace-pre-wrap leading-relaxed text-xs">
                        {previewNode.body_text}
                      </p>

                      {/* Footer */}
                      {previewNode.footer_text && (
                        <p className="text-[10px] text-neutral-300/80 pt-0.5 italic">
                          {previewNode.footer_text}
                        </p>
                      )}

                      {/* Time & Checks */}
                      <div className="flex items-center justify-end gap-1 text-[9px] text-neutral-300/80 mt-1">
                        <span>10:45 AM</span>
                        <CheckCheck className="h-3 w-3 text-sky-400" />
                      </div>
                    </div>

                    {/* Interactive Action Buttons or List Menu */}
                    {previewNode.options && previewNode.options.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        {previewNode.options.length <= 3 ? (
                          // Quick Reply Buttons (<= 3 options)
                          previewNode.options.map((opt) => (
                            <button
                              key={opt.option_id}
                              type="button"
                              onClick={() => {
                                if (opt.next_node_id && nodeMap.has(opt.next_node_id)) {
                                  setPreviewNode(nodeMap.get(opt.next_node_id)!);
                                }
                              }}
                              className="w-full py-1.5 px-3 bg-[#202c33] hover:bg-[#2a3942] active:bg-[#111b21] text-sky-400 text-center font-medium rounded-md shadow-sm border border-neutral-700/40 text-[11px] transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>{opt.label}</span>
                              {opt.is_correct_answer && (
                                <span className="text-[9px] text-emerald-400 font-bold">({opt.points || 10} pts)</span>
                              )}
                              {opt.next_node_id && <ArrowRight className="h-2.5 w-2.5 text-neutral-400" />}
                            </button>
                          ))
                        ) : (
                          // List Menu Trigger (> 3 options, up to 10)
                          <div>
                            <button
                              type="button"
                              onClick={() => setPreviewListOpen(!previewListOpen)}
                              className="w-full py-2 px-3 bg-[#202c33] hover:bg-[#2a3942] text-sky-400 text-center font-medium rounded-md shadow-sm border border-neutral-700/40 text-xs flex items-center justify-center gap-1.5"
                            >
                              <MenuSquare className="h-3 w-3" />
                              <span>Select Option ({previewNode.options.length})</span>
                            </button>

                            {/* Simulated List Menu Drawer */}
                            {previewListOpen && (
                              <div className="mt-2 bg-[#202c33] rounded-lg border border-neutral-700 p-2 space-y-1 shadow-lg max-h-48 overflow-y-auto">
                                <p className="text-[10px] uppercase font-bold text-neutral-400 px-1">
                                  Menu Options
                                </p>
                                {previewNode.options.map((opt) => (
                                  <div
                                    key={opt.option_id}
                                    onClick={() => {
                                      if (opt.next_node_id && nodeMap.has(opt.next_node_id)) {
                                        setPreviewNode(nodeMap.get(opt.next_node_id)!);
                                        setPreviewListOpen(false);
                                      }
                                    }}
                                    className="p-1.5 rounded hover:bg-[#2a3942] cursor-pointer text-[11px] flex items-center justify-between text-neutral-200"
                                  >
                                    <div>
                                      <p className="font-medium text-white">{opt.label}</p>
                                      {opt.description && (
                                        <p className="text-[9px] text-neutral-400">{opt.description}</p>
                                      )}
                                    </div>
                                    {opt.is_correct_answer && (
                                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] h-4">
                                        Correct
                                      </Badge>
                                    )}
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
                    <p>Select any node from the tree view to simulate the WhatsApp message.</p>
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

          <div className="text-[11px] text-muted-foreground text-center space-y-1">
            <p className="flex items-center justify-center gap-1">
              <Info className="h-3 w-3" />
              Meta Cloud API limits:
            </p>
            <p>1–3 options render as Quick Reply Buttons (max 20 chars).</p>
            <p>4–10 options render as List Menu items (max 24 chars).</p>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingNode ? <Edit2 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              {editingNode ? "Edit Workflow Node" : "Create New Workflow Node"}
            </DialogTitle>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Node Title *</label>
                <Input
                  placeholder="e.g., Biology Quiz Q1"
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
                <label className="text-xs font-semibold text-foreground">Node Key (Unique ID) *</label>
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
                <label className="text-xs font-semibold text-foreground">Node Type</label>
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
                <label className="text-xs font-semibold text-foreground">Parent Node</label>
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
                    <SelectItem value="none">None (Root Node)</SelectItem>
                    {nodes
                      .filter((n) => !editingNode || n.id !== editingNode.id)
                      .map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          Lvl {n.level}: {n.title}
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
                WhatsApp Message Content
              </h4>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="font-semibold text-foreground">Header Text (Optional)</label>
                  <span className="text-muted-foreground text-[10px]">{formHeaderText.length}/60</span>
                </div>
                <Input
                  placeholder="e.g., HOPECHAT ASSESSMENT"
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
                  placeholder="e.g., Which organelle is responsible for cellular respiration?"
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
                  placeholder="e.g., Tap an option below to answer"
                  value={formFooterText}
                  maxLength={60}
                  onChange={(e) => setFormFooterText(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Options / Choices */}
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Interactive Choices ({formOptions.length}/10)
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {formOptions.length <= 3
                      ? "1–3 items send as Quick Reply Buttons (max 20 chars per label)."
                      : "4–10 items send as an Interactive List Menu (max 24 chars per label)."}
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

              <div className="space-y-2.5">
                {formOptions.map((opt, idx) => {
                  const maxChar = formOptions.length <= 3 ? 20 : 24;
                  const isOverLimit = opt.label.length > maxChar;

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-md border text-xs space-y-2 ${
                        isOverLimit ? "border-destructive bg-destructive/5" : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-muted-foreground w-5 text-center">{idx + 1}.</span>
                        <div className="flex-1">
                          <Input
                            placeholder={`Label (max ${maxChar} chars)`}
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
                          <label className="text-[10px] text-muted-foreground">Route to Next Screen</label>
                          <Select
                            value={opt.next_node_id || "end"}
                            onValueChange={(val) => {
                              const updated = [...formOptions];
                              updated[idx].next_node_id = val === "end" ? null : val;
                              setFormOptions(updated);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs bg-background">
                              <SelectValue placeholder="End of flow" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="end">None (End of flow)</SelectItem>
                              {nodes
                                .filter((n) => !editingNode || n.id !== editingNode.id)
                                .map((n) => (
                                  <SelectItem key={n.id} value={n.id}>
                                    {n.title} ({n.node_key})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* If Question node: allow marking correct answer and points */}
                        {formNodeType === "question" && (
                          <div className="flex items-center gap-3 pt-3">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px]">
                              <input
                                type="checkbox"
                                checked={opt.is_correct_answer}
                                onChange={(e) => {
                                  const updated = [...formOptions];
                                  // Can allow multiple or single correct
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
                                  className="h-6 w-14 text-xs p-1 text-center bg-background"
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
              {isSaving ? "Saving..." : editingNode ? "Update Node" : "Create Node"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
