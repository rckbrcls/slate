import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RefreshCw,
  Terminal,
  LayoutGrid,
  MessageCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Scissors,
  Heart,
  Globe,
  Copy,
} from "lucide-react"
import { toast } from "sonner"

const PROMPT_SUGGESTIONS = [
  {
    id: "analyze-structure",
    label: "Analyze Structure",
    icon: <LayoutGrid className="size-4" />,
    prompt: "Analyze the structure of this screenplay. Identify the act breaks, major turning points, and pacing issues.",
  },
  {
    id: "improve-dialogue",
    label: "Improve Dialogue",
    icon: <MessageCircle className="size-4" />,
    prompt: "Read this screenplay and improve the naturalness of the dialogue. Make characters sound more distinct from each other.",
  },
  {
    id: "check-wga",
    label: "Check WGA Format",
    icon: <CheckCircle className="size-4" />,
    prompt: "Review this screenplay for WGA formatting compliance. Check scene headings, character cues, transitions, parentheticals.",
  },
  {
    id: "strengthen-act2",
    label: "Strengthen Act 2",
    icon: <TrendingUp className="size-4" />,
    prompt: "Analyze the second act of this screenplay. Identify where the midpoint occurs, whether there's sufficient rising action.",
  },
  {
    id: "character-consistency",
    label: "Character Consistency",
    icon: <Users className="size-4" />,
    prompt: "Analyze each character for consistency. Check if their voice, motivations, and behavior remain consistent throughout.",
  },
  {
    id: "cut-pages",
    label: "Trim Length",
    icon: <Scissors className="size-4" />,
    prompt: "This screenplay needs to be shorter. Identify scenes that can be cut or condensed, redundant dialogue to trim.",
  },
  {
    id: "bechdel-analysis",
    label: "Bechdel Analysis",
    icon: <Heart className="size-4" />,
    prompt: "Analyze this screenplay using the Bechdel test criteria.",
  },
  {
    id: "world-building",
    label: "World Building",
    icon: <Globe className="size-4" />,
    prompt: "Review the world-building for consistency. Check location descriptions, time continuity, and setting details.",
  },
]

interface AISidePanelProps {
  externalChangePending: boolean
  onReloadFromDisk: () => void
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  toast.success("Copied to clipboard")
}

export function AISidePanel({
  externalChangePending,
  onReloadFromDisk,
}: AISidePanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-medium">AI Assistant</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {externalChangePending && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Disk Update Waiting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  The file changed on disk while you still had unsaved edits in the editor.
                </p>
                <Button size="sm" onClick={onReloadFromDisk} className="w-full">
                  <RefreshCw className="mr-1 size-3.5" />
                  Reload from Disk
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="size-4 text-muted-foreground" />
              Claude Code
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Run Claude Code in your terminal to edit this screenplay. Disk changes will sync here automatically when the editor is clean.
            </p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Prompt Suggestions</p>
            <p className="text-xs text-muted-foreground">
              Click to copy, then paste into Claude Code.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start gap-1.5 px-2 py-1.5 text-xs"
                  onClick={() => copyToClipboard(suggestion.prompt)}
                >
                  {suggestion.icon}
                  <span className="truncate">{suggestion.label}</span>
                  <Copy className="ml-auto size-3 opacity-50" />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
