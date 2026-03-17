import { ReferenceLine, Label } from "recharts"
import type { BeatMarker } from "@/lib/analytics/beatsheet"

const ACT_COLORS: Record<number, string> = {
  1: "#60a5fa", // blue
  2: "#4ade80", // green
  3: "#f87171", // red
}

interface BeatSheetOverlayProps {
  beats: BeatMarker[]
}

export function BeatSheetOverlay({ beats }: BeatSheetOverlayProps) {
  return (
    <>
      {beats.map((beat) => (
        <ReferenceLine
          key={beat.name}
          x={beat.targetPage}
          stroke={ACT_COLORS[beat.act]}
          strokeDasharray="3 3"
          strokeOpacity={0.6}
        >
          <Label
            value={beat.name}
            position="top"
            angle={-45}
            style={{
              fontSize: 8,
              fill: ACT_COLORS[beat.act],
              fontWeight: 500,
            }}
          />
        </ReferenceLine>
      ))}
    </>
  )
}
