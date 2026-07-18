import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Minus } from "lucide-react"
import type { AnalysisRun, MetricResult, VersionComparison } from "../../../electron/shared/types"

function isTermCount(entry: unknown): entry is { term: string; count: number } {
  if (!entry || typeof entry !== "object") return false
  return (
    "term" in entry &&
    typeof entry.term === "string" &&
    "count" in entry &&
    typeof entry.count === "number"
  )
}

function displayValue(metric: MetricResult) {
  if (Array.isArray(metric.value) || typeof metric.value === "object") return "—"
  if (metric.kind === "percentage") return `${metric.value}%`
  return `${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`
}

function deltaFor(metric: MetricResult, comparison: VersionComparison | null) {
  return comparison?.metricDeltas.find((delta) => delta.key === metric.key)?.delta ?? null
}

interface MetricOverviewProps {
  analysis: AnalysisRun
  comparison: VersionComparison | null
}

export function MetricOverview({ analysis, comparison }: MetricOverviewProps) {
  const scalarMetrics = analysis.metrics.filter(
    (metric) => metric.kind === "number" || metric.kind === "percentage",
  )
  const frequentTerms = analysis.metrics.find((metric) => metric.key === "frequent-terms")
  const terms = Array.isArray(frequentTerms?.value)
    ? frequentTerms.value.filter(isTermCount)
    : []

  return (
    <div className="mx-auto w-full max-w-6xl px-7 py-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Evidence snapshot</p>
          <h2 className="mt-2 font-heading text-2xl">What this version contains</h2>
        </div>
        <p className="max-w-sm text-right text-xs leading-5 text-muted-foreground">
          Deterministic analysis · {analysis.algorithmVersion} · {analysis.durationMs} ms
        </p>
      </div>

      <div className="grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-4">
        {scalarMetrics.map((metric) => {
          const delta = deltaFor(metric, comparison)
          return (
            <article key={metric.key} className="min-h-36 border-b border-r border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                {delta !== null && (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    {delta > 0 ? <ArrowUpRight className="size-3" /> : delta < 0 ? <ArrowDownRight className="size-3" /> : <Minus className="size-3" />}
                    {delta > 0 ? "+" : ""}{delta}
                  </span>
                )}
              </div>
              <p className="mt-5 font-heading text-3xl leading-none">{displayValue(metric)}</p>
              <p className="mt-4 text-[11px] leading-4 text-muted-foreground">{metric.description}</p>
            </article>
          )
        })}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.8fr]">
        <section>
          <h3 className="text-sm font-semibold">Frequent terms</h3>
          <p className="mt-1 text-xs text-muted-foreground">Stop words are excluded from this distribution.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {terms.length > 0 ? terms.map((term, index) => (
              <span
                key={term.term}
                className="inline-flex items-baseline gap-2 border border-border bg-card px-3 py-2"
                style={{ fontSize: `${Math.max(12, 17 - index * 0.35)}px` }}
              >
                {term.term}
                <span className="font-mono text-[10px] text-muted-foreground">{term.count}</span>
              </span>
            )) : <p className="text-sm text-muted-foreground">No repeated terms were detected.</p>}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold">Findings</h3>
          <p className="mt-1 text-xs text-muted-foreground">Every finding exposes its deterministic criterion.</p>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {analysis.findings.length === 0 ? (
              <div className="flex gap-3 py-5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                No findings for this pack and version.
              </div>
            ) : analysis.findings.map((finding) => (
              <article key={`${finding.key}-${finding.elementIds.join("-")}`} className="py-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <div>
                    <h4 className="text-sm font-medium">{finding.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{finding.description}</p>
                    <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Criterion: {finding.criterion}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
