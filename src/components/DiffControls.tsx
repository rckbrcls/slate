import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Check, X } from "lucide-react"

interface DiffControlsProps {
  hunkCount: number
  onAcceptAll: () => void
  onRejectAll: () => void
}

export function DiffControls({ hunkCount, onAcceptAll, onRejectAll }: DiffControlsProps) {
  return (
    <Card className="absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 shadow-lg">
      <Badge variant="secondary" className="text-xs">
        {hunkCount} changes
      </Badge>
      <Button variant="ghost" size="icon-sm" onClick={onAcceptAll} title="Accept All">
        <Check className="size-4 text-green-500" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onRejectAll} title="Reject All">
        <X className="size-4 text-red-500" />
      </Button>
    </Card>
  )
}
