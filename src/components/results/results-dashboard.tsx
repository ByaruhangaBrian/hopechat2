"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Target, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AttemptRow = {
  id: string;
  testId: string;
  testTitle: string;
  contactId: string;
  contactName: string;
  score: number;
  totalQuestions: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  routingAnswers: Record<string, string>;
};

type QuestionStat = {
  questionId: string;
  text: string;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  stats: Array<{ testId: string; testTitle: string; answered: number; correct: number }>;
};

type ResultsPayload = {
  tests: Array<{
    id: string;
    title: string;
    attemptCount: number;
    avgScore: number;
    avgDuration: number;
  }>;
  questions: QuestionStat[];
  summary: { totalAttempts: number; avgScore: number | null };
  routingKeys: string[];
  attempts: AttemptRow[];
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ResultsDashboard() {
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const [testId, setTestId] = useState("");
  const [routingKey, setRoutingKey] = useState("");
  const [routingValue, setRoutingValue] = useState("");

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (testId) params.set("testId", testId);
      if (routingKey) params.set("routingKey", routingKey);
      if (routingValue) params.set("routingValue", routingValue);
      const res = await fetch(`/api/results?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load results");
      const payload = await res.json();
      setData(payload);
    } catch (err: any) {
      toast.error(err.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [testId, routingKey, routingValue]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    const onFocus = () => fetchResults();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchResults]);

  /* ---- Filters ---- */
  function resetFilters() {
    setTestId("");
    setRoutingKey("");
    setRoutingValue("");
  }

  const routingValueOptions =
    data && routingKey
      ? (data.attempts ?? []).reduce<string[]>((acc, a) => {
          const v = a.routingAnswers?.[routingKey];
          if (v && !acc.includes(v)) acc.push(v);
          return acc;
        }, [])
      : [];

  const hasFilters = Boolean(testId || routingKey || routingValue);

  /* ------------------------------------------------------------------ */

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const questionsNeedingAttention =
    data?.questions.filter((q) => q.totalAnswered >= 3 && q.accuracy < 0.6) ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Results &amp; Insights</h1>
          <p className="text-sm text-muted-foreground">
            See who took which test, and which subjects or questions need attention.
          </p>
        </div>
        <ButtonGhost onClick={() => fetchResults()} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </ButtonGhost>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalAttempts ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.summary.avgScore == null ? "—" : `${Math.round(data!.summary.avgScore * 100)}%`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tests taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.tests.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Questions to review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questionsNeedingAttention.length}</div>
          </CardContent>
        </Card>
      </div>

      {data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Test / Practice</label>
              <select
                value={testId}
                onChange={(e) => setTestId(e.target.value)}
                className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm"
              >
                <option value="">All tests</option>
                {data.attempts.reduce<string[]>((acc, a) => {
                  if (!acc.includes(a.testId)) acc.push(a.testId);
                  return acc;
                }, []).map((tid) => (
                  <option key={tid} value={tid}>
                    {data.attempts.find((a) => a.testId === tid)?.testTitle ?? tid}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Routing question</label>
              <select
                value={routingKey}
                onChange={(e) => {
                  setRoutingKey(e.target.value);
                  setRoutingValue("");
                }}
                className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm"
              >
                <option value="">All routing questions</option>
                {(data.routingKeys ?? []).map((k) => (
                  <option key={k} value={k}>/{k}</option>
                ))}
              </select>
            </div>
            {routingKey && (
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">Routing answer</label>
                <select
                  value={routingValue}
                  onChange={(e) => setRoutingValue(e.target.value)}
                  className="w-full rounded-md border border-input bg-muted px-2 py-1.5 text-sm"
                >
                  <option value="">Any answer</option>
                  {routingValueOptions.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            )}
            {hasFilters && (
              <ButtonGhost onClick={resetFilters}>Clear</ButtonGhost>
            )}
          </CardContent>
        </Card>
      )}

      {/* Per-test breakdown */}
      {data && data.tests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Per-test breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead className="text-right">Avg score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-right">{t.attemptCount}</TableCell>
                    <TableCell className="text-right">
                      {t.attemptCount === 0 ? "—" : `${Math.round(t.avgScore * 100)}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Question difficulty */}
      {data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Question difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            {data.questions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No question results yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead className="text-right">Answered</TableHead>
                    <TableHead className="text-right">Correct</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.questions.map((q) => (
                    <TableRow key={q.questionId}>
                      <TableCell className="max-w-[320px]">
                        <span className="line-clamp-2">{q.text}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {q.stats.map((s) => (
                            <Badge key={s.testId} variant="outline">{s.testTitle}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{q.totalAnswered}</TableCell>
                      <TableCell className="text-right">{q.totalCorrect}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {Math.round(q.accuracy * 100)}%
                          {q.totalAnswered >= 3 && q.accuracy < 0.6 ? (
                            <XCircle className="h-4 w-4 text-destructive" aria-label="needs attention" />
                          ) : q.accuracy >= 0.6 ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="ok" />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attempts */}
      {data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.attempts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No attempts match the current filters.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Routing answers</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.attempts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.contactName || "Unknown"}</TableCell>
                      <TableCell>{a.testTitle}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1">
                          {a.totalQuestions > 0
                            ? `${Math.round((a.score / a.totalQuestions) * 100)}% (${a.score}/${a.totalQuestions})`
                            : `${a.score}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(a.routingAnswers ?? {}).filter(([, v]) => v).map(([k, v]) => (
                            <Badge key={k} className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15">
                              {k}: {v}
                            </Badge>
                          ))}
                          {Object.keys(a.routingAnswers ?? {}).filter((k) => a.routingAnswers?.[k]).length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.completedAt ? new Date(a.completedAt).toLocaleString() : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ButtonGhost({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}