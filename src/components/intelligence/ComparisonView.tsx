import { ArrowRight, CheckCircle2, CircleDot, GitCompareArrows } from "lucide-react"
import type { DocumentVersion, VersionComparison } from "../../../electron/shared/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ComparisonViewProps {
  versions: DocumentVersion[]
  baseVersionId: string
  targetVersionId: string
  onBaseChange: (versionId: string) => void
  onTargetChange: (versionId: string) => void
  comparison: VersionComparison | null
  loading: boolean
}

function versionLabel(version: DocumentVersion) {
  return `v${version.ordinal} · ${version.sourceName}`
}

export function ComparisonView({
  versions,
  baseVersionId,
  targetVersionId,
  onBaseChange,
  onTargetChange,
  comparison,
  loading,
}: ComparisonViewProps) {
  if (versions.length < 2) {
    return (
      <div className="grid min-h-96 place-items-center p-8 text-center">
        <div>
          <GitCompareArrows className="mx-auto size-7 text-primary" />
          <h2 className="mt-4 font-heading text-xl">A second version unlocks comparison</h2>
          <p className="mt-2 text-sm text-muted-foreground">Import a revision to measure its change against this baseline.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-7 py-8">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pairwise review</p>
          <h2 className="mt-2 font-heading text-2xl">Compare two points in the timeline</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={baseVersionId} onValueChange={onBaseChange}>
            <SelectTrigger className="w-52 rounded-md bg-input"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-md bg-popover">
              {versions.map((version) => <SelectItem key={version.id} value={version.id}>{versionLabel(version)}</SelectItem>)}
            </SelectContent>
          </Select>
          <ArrowRight className="size-4 text-muted-foreground" />
          <Select value={targetVersionId} onValueChange={onTargetChange}>
            <SelectTrigger className="w-52 rounded-md bg-input"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-md bg-popover">
              {versions.map((version) => <SelectItem key={version.id} value={version.id}>{versionLabel(version)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Comparing versions...</div>
      ) : !comparison ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Choose two different versions.</div>
      ) : (
        <>
          <section className="grid border-b border-border py-7 sm:grid-cols-4">
            {Object.entries(comparison.summary).map(([key, value]) => (
              <div key={key} className="border-l border-border px-5 first:border-l-0">
                <p className="text-xs capitalize text-muted-foreground">{key}</p>
                <p className="mt-2 font-heading text-2xl">{value}</p>
              </div>
            ))}
          </section>

          <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_0.75fr]">
            <section>
              <h3 className="text-sm font-semibold">Content changes</h3>
              <div className="mt-4 divide-y divide-border border-y border-border">
                {comparison.changes.length === 0 ? (
                  <div className="flex gap-3 py-5 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-primary" />No normalized content changed.
                  </div>
                ) : comparison.changes.map((change, index) => (
                  <article key={`${change.status}-${index}`} className="grid gap-4 py-5 sm:grid-cols-[90px_1fr]">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-primary">{change.status}</span>
                    <div className="grid gap-3 text-xs leading-5">
                      {change.baseText && <div className="border-l-2 border-red-400/70 pl-3 text-muted-foreground line-through">{change.baseText}</div>}
                      {change.targetText && <div className="border-l-2 border-primary pl-3">{change.targetText}</div>}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Metric deltas</h3>
              <div className="mt-4 divide-y divide-border border-y border-border">
                {comparison.metricDeltas.filter((metric) => metric.delta !== null).map((metric) => (
                  <div key={metric.key} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-xs">
                    <span className="text-muted-foreground">{metric.label}</span>
                    <span className="font-mono">{metric.delta && metric.delta > 0 ? "+" : ""}{metric.delta}{metric.unit ? ` ${metric.unit}` : ""}</span>
                  </div>
                ))}
              </div>

              <h3 className="mt-9 text-sm font-semibold">Finding lifecycle</h3>
              <div className="mt-4 divide-y divide-border border-y border-border">
                {comparison.findingStates.length === 0 ? (
                  <p className="py-4 text-xs text-muted-foreground">No findings in either version.</p>
                ) : comparison.findingStates.map((finding) => (
                  <div key={`${finding.key}-${finding.status}`} className="flex items-center justify-between gap-3 py-3 text-xs">
                    <span className="flex items-center gap-2"><CircleDot className="size-3 text-primary" />{finding.key}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">{finding.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
