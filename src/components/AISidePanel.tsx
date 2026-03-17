import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { QUICK_ACTIONS } from "@/lib/claude/quickActions"
import type { ClaudeStreamEvent } from "@/lib/claude/streamParser"
import { formatToolUse, getToolIcon, getPhaseLabel } from "@/lib/claude/streamParser"
import type { ClaudeStatus } from "@/hooks/useClaude"
import {
  Send,
  Check,
  X,
  Loader2,
  LayoutGrid,
  MessageCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Scissors,
  Heart,
  Globe,
} from "lucide-react"

const ICON_MAP: Record<string, React.ReactNode> = {
  layout: <LayoutGrid className="size-4" />,
  "message-circle": <MessageCircle className="size-4" />,
  "check-circle": <CheckCircle className="size-4" />,
  "trending-up": <TrendingUp className="size-4" />,
  users: <Users className="size-4" />,
  scissors: <Scissors className="size-4" />,
  heart: <Heart className="size-4" />,
  globe: <Globe className="size-4" />,
}

interface AISidePanelProps {
  status: ClaudeStatus
  log: ClaudeStreamEvent[]
  error: string | null
  diffHunkCount: number
  onRunClaude: (instruction: string) => void
  onAcceptAll: () => void
  onRejectAll: () => void
}

function StreamLog({ log, isRunning }: { log: ClaudeStreamEvent[]; isRunning: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [log])

  return (
    <div ref={scrollRef} className="h-full overflow-auto p-3 text-xs">
      {log.map((event, i) => {
        const isLast = i === log.length - 1
        switch (event.type) {
          case "assistant":
            return (
              <div key={i} className="mb-2 whitespace-pre-wrap text-foreground">
                {event.message}
                {isRunning && isLast && (
                  <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-foreground" />
                )}
              </div>
            )
          case "thinking":
            return (
              <div key={i} className="mb-2 text-muted-foreground italic">
                {isRunning && isLast ? "Thinking..." : "Thought for a moment"}
              </div>
            )
          case "tool_use":
            return (
              <div key={i} className="mb-1.5 flex items-center gap-1.5 text-blue-400">
                <span>{getToolIcon(event.name)}</span>
                <span>{formatToolUse(event.name, event.input)}</span>
                {isRunning && isLast && (
                  <Loader2 className="size-3 animate-spin" />
                )}
              </div>
            )
          case "tool_result":
            return (
              <div key={i} className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle className="size-3 text-green-500" />
                <span>{event.name ? `${event.name} complete` : "Done"}</span>
              </div>
            )
          case "result":
            return (
              <div key={i} className="mt-2 rounded-md border border-green-500/20 bg-green-500/5 p-2">
                <div className="font-medium text-green-400">{event.text}</div>
                {event.cost != null && (
                  <div className="mt-1 text-muted-foreground">
                    Cost: ${event.cost.toFixed(4)}
                  </div>
                )}
              </div>
            )
          case "error":
            return (
              <div key={i} className="mb-1.5 text-destructive">
                {event.message}
              </div>
            )
          case "system":
            return (
              <div key={i} className="mb-1.5 text-muted-foreground">
                {event.message}
              </div>
            )
        }
      })}
    </div>
  )
}

export function AISidePanel({
  status,
  log,
  error,
  diffHunkCount,
  onRunClaude,
  onAcceptAll,
  onRejectAll,
}: AISidePanelProps) {
  const [instruction, setInstruction] = useState("")

  const handleSubmit = () => {
    if (!instruction.trim()) return
    onRunClaude(instruction.trim())
    setInstruction("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (status === "reviewing") {
    return (
      <div className="flex h-full flex-col p-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              Review Changes
              <Badge variant="secondary">{diffHunkCount} changes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Claude has made changes to your screenplay. Review the highlighted diff in the editor.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onAcceptAll} className="flex-1">
                <Check className="mr-1 size-3.5" />
                Accept All
              </Button>
              <Button size="sm" variant="outline" onClick={onRejectAll} className="flex-1">
                <X className="mr-1 size-3.5" />
                Reject All
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        )}
      </div>
    )
  }

  if (status === "running") {
    const phaseLabel = getPhaseLabel(log)
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{phaseLabel}</span>
        </div>
        <ScrollArea className="flex-1">
          <StreamLog log={log} isRunning />
        </ScrollArea>
      </div>
    )
  }

  // Idle state
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-medium">AI Assistant</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {/* Custom instruction */}
          <div className="space-y-2">
            <Textarea
              placeholder="Ask Claude to edit your screenplay..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="resize-none text-sm"
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!instruction.trim()}
              className="w-full"
            >
              <Send className="mr-1 size-3.5" />
              Send to Claude
            </Button>
          </div>

          <Separator />

          {/* Quick actions */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start gap-1.5 px-2 py-1.5 text-xs"
                  onClick={() => onRunClaude(action.instruction)}
                >
                  {ICON_MAP[action.icon]}
                  <span className="truncate">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {error && (
        <div className="border-t border-border px-3 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
