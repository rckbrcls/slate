import { useState } from "react"
import { ChevronDown, ChevronRight, GitCommitHorizontal } from "lucide-react"
import type { GitLogEntry } from "@/lib/git/types"

interface GitHistoryProps {
  log: GitLogEntry[]
  currentFile?: string | null
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function GitHistory({ log }: GitHistoryProps) {
  const [expanded, setExpanded] = useState(false)

  if (log.length === 0) return null

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        <GitCommitHorizontal className="size-3.5" />
        History ({log.length})
      </button>

      {expanded && (
        <div className="max-h-[200px] overflow-y-auto pb-2">
          {log.map((entry) => (
            <div
              key={entry.hash}
              className="flex items-start gap-2 px-3 py-1 text-xs"
            >
              <span className="font-mono text-muted-foreground shrink-0">
                {entry.shortHash}
              </span>
              <span className="truncate text-foreground">{entry.message}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">
                {formatRelativeDate(entry.date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
