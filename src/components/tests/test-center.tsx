"use client";

import React, { useState } from "react";
import { FolderTree, Route, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestBuilderScreen } from "@/components/tests/test-builder";
import { FlowBuilderScreen } from "@/components/routing/flow-builder";
import { ResultsDashboard } from "@/components/results/results-dashboard";

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
      <Tabs value={tab} onValueChange={(v) => setTab((v as Tab) ?? "tests")} className="w-full">
        <TabsList className="border border-border bg-muted/50 inline-flex h-11 flex-wrap justify-start rounded-xl p-1">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="px-4 py-1.5 text-sm font-medium data-active:bg-card data-active:text-primary data-active:shadow-sm"
            >
              <t.icon className="mr-1.5 h-4 w-4" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Keep all three mounted so unsaved work survives tab switches. */}
      <div className={tab === "tests" ? "" : "hidden"}>
        <TestBuilderScreen />
      </div>
      <div className={tab === "routing" ? "" : "hidden"}>
        <FlowBuilderScreen />
      </div>
      <div className={tab === "results" ? "" : "hidden"}>
        <ResultsDashboard />
      </div>
    </div>
  );
}