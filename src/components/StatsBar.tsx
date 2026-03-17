import { useState } from "react"
import type { ScreenplayStats } from "@/lib/stats"
import { ChevronUp, ChevronDown } from "lucide-react"

interface StatsBarProps {
  stats: ScreenplayStats | null
}

export function StatsBar({ stats }: StatsBarProps) {
  const [expanded, setExpanded] = useState(false)

  if (!stats) return null

  const formatRatio = (ratio: number) => `${Math.round(ratio * 100)}%`

  return (
    <footer className="shrink-0 border-t border-border bg-background text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-3 py-1.5 hover:bg-muted/50"
      >
        <span>
          {stats.pages} {stats.pages === 1 ? "pg" : "pgs"}
        </span>
        <span>~{stats.estimatedMinutes} min</span>
        <span>{stats.scenes} scenes</span>
        <span>{stats.words.toLocaleString()} words</span>
        <span className="ml-auto">
          {expanded ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
        </span>
      </button>

      {expanded && (
        <div className="grid grid-cols-4 gap-4 border-t border-border px-3 py-2">
          <div>
            <div className="font-medium text-foreground">{stats.characters}</div>
            <div>Characters</div>
          </div>
          <div>
            <div className="font-medium text-foreground">
              {stats.dialogueWords.toLocaleString()}
            </div>
            <div>Dialogue words</div>
          </div>
          <div>
            <div className="font-medium text-foreground">
              {stats.actionWords.toLocaleString()}
            </div>
            <div>Action words</div>
          </div>
          <div>
            <div className="font-medium text-foreground">
              {formatRatio(stats.dialogueRatio)} / {formatRatio(1 - stats.dialogueRatio)}
            </div>
            <div>Dialogue / Action</div>
          </div>
        </div>
      )}
    </footer>
  )
}
