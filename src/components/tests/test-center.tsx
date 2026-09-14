"use client";

import React, { useState } from "react";
import { FolderTree, Route, BarChart3 } from "lucide-react";
import { TestBuilderScreen } from "@/components/tests/test-builder";
import { FlowBuilderScreen } from "@/components/routing/flow-builder";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { cn } from "@/lib/utils";

type Tab = "tests" | "routing" | "results";

const TABS: Array<{ value: Tab; label: string; icon: any }> = [
  { value: "tests", label: "Tests & Practice", icon: FolderTree },
  { value: "routing", label: "Routing Flows", icon: Route },
  { value: "results", label: "Results & Insights", icon: BarChart3 },
];

export function TestCenterScreen() {
  const [tab, setTab] = useState<Tab>("tests");

  return (
    <div className="flex flex-col gap-6">
      {/* Simple button-based tab bar – avoids base-ui controlled-mode quirks */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              tab === t.value
                ? "bg-card text-primary shadow-sm shadow-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Only mount the active component so an error in one tab can't crash the others */}
      {tab === "tests" && <TestBuilderScreen />}
      {tab === "routing" && <FlowBuilderScreen />}
      {tab === "results" && <ResultsDashboard />}
    </div>
  );
}