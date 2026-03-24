import { useMemo } from "react"
import { motion } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { BeatMarker } from "@/lib/analytics/beatsheet"
import { BEAT_DESCRIPTIONS, getBeatProgress } from "@/lib/analytics/beatsheet"

interface BeatsTabProps {
  beatMarkers: BeatMarker[]
  currentPages: number
}

const actColors: Record<number, string> = {
  1: "var(--chart-1)",
  2: "var(--chart-4)",
  3: "var(--chart-5)",
}

const actLabels: Record<number, string> = {
  1: "Act 1 — Setup",
  2: "Act 2 — Confrontation",
  3: "Act 3 — Resolution",
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

export function BeatsTab({ beatMarkers, currentPages }: BeatsTabProps) {
  const progress = useMemo(
    () => getBeatProgress(beatMarkers, currentPages),
    [beatMarkers, currentPages],
  )

  const grouped = useMemo(() => {
    const groups = new Map<number, BeatMarker[]>()
    for (const beat of beatMarkers) {
      if (!groups.has(beat.act)) groups.set(beat.act, [])
      groups.get(beat.act)!.push(beat)
    }
    return groups
  }, [beatMarkers])

  // Standard screenplay length for timeline positioning
  const standardLength = Math.max(currentPages, 110)

  if (beatMarkers.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-8">
        No beat data
      </p>
    )
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Visual Timeline Bar */}
      <motion.div variants={fadeUp}>
        <Card className="p-0">
          <CardContent className="px-4 py-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Beat Timeline
            </p>
            <TooltipProvider>
              <div className="relative">
                {/* Act segments background */}
                <div className="flex h-6 rounded-md overflow-hidden">
                  <div
                    className="h-full opacity-20"
                    style={{
                      width: "25%",
                      backgroundColor: actColors[1],
                    }}
                  />
                  <div
                    className="h-full opacity-20"
                    style={{
                      width: "50%",
                      backgroundColor: actColors[2],
                    }}
                  />
                  <div
                    className="h-full opacity-20"
                    style={{
                      width: "25%",
                      backgroundColor: actColors[3],
                    }}
                  />
                </div>

                {/* Beat markers */}
                <div className="absolute inset-0">
                  {beatMarkers.map((beat) => {
                    const pos = (beat.targetPage / standardLength) * 100
                    const reached = currentPages >= beat.targetPage
                    return (
                      <Tooltip key={beat.name}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                            style={{ left: `${Math.min(pos, 98)}%` }}
                          >
                            <div
                              className={`size-2.5 rotate-45 border ${
                                reached
                                  ? "border-foreground"
                                  : "border-muted-foreground/50"
                              }`}
                              style={{
                                backgroundColor: reached
                                  ? actColors[beat.act]
                                  : "transparent",
                              }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-48">
                          <p className="font-medium">{beat.name}</p>
                          <p className="text-muted-foreground">
                            p.{beat.targetPage}
                            {BEAT_DESCRIPTIONS[beat.name] && (
                              <> — {BEAT_DESCRIPTIONS[beat.name]}</>
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>

                {/* Current position indicator */}
                {currentPages > 0 && (
                  <div
                    className="absolute top-0 h-6 border-l-2 border-foreground"
                    style={{
                      left: `${Math.min((currentPages / standardLength) * 100, 100)}%`,
                    }}
                  >
                    <div className="absolute -top-4 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap">
                      p.{currentPages}
                    </div>
                  </div>
                )}
              </div>

              {/* Act labels */}
              <div className="flex mt-1">
                <span className="text-[9px] text-muted-foreground" style={{ width: "25%" }}>
                  Act 1
                </span>
                <span
                  className="text-[9px] text-muted-foreground text-center"
                  style={{ width: "50%" }}
                >
                  Act 2
                </span>
                <span
                  className="text-[9px] text-muted-foreground text-right"
                  style={{ width: "25%" }}
                >
                  Act 3
                </span>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </motion.div>

      {/* Beat Cards Grouped by Act */}
      {[1, 2, 3].map((act) => {
        const beats = grouped.get(act as 1 | 2 | 3)
        if (!beats || beats.length === 0) return null
        return (
          <motion.div key={act} variants={fadeUp}>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: actColors[act] }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {actLabels[act]}
              </span>
            </div>
            <div className="space-y-1.5">
              {beats.map((beat) => {
                const reached = currentPages >= beat.targetPage
                return (
                  <TooltipProvider key={beat.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card
                          className={`p-0 transition-opacity ${
                            reached ? "opacity-100" : "opacity-50"
                          }`}
                        >
                          <CardContent className="px-3 py-2 flex items-center gap-2">
                            <div
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: actColors[act] }}
                            />
                            <span className="text-xs font-medium flex-1">
                              {beat.name}
                            </span>
                            <Badge
                              variant={reached ? "secondary" : "outline"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              p.{beat.targetPage}
                            </Badge>
                            {reached && (
                              <div className="w-8">
                                <Progress value={100} className="h-1" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      {BEAT_DESCRIPTIONS[beat.name] && (
                        <TooltipContent
                          side="right"
                          className="text-xs max-w-56"
                        >
                          {BEAT_DESCRIPTIONS[beat.name]}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
            {act < 3 && <Separator className="mt-3" />}
          </motion.div>
        )
      })}

      {/* Coverage Summary */}
      <motion.div variants={fadeUp}>
        <Separator className="my-1" />
        <Card className="p-0">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                {progress.reached} of {progress.total} beats reached
              </p>
              <span className="text-xs font-medium">
                {Math.round((progress.reached / progress.total) * 100)}%
              </span>
            </div>
            <Progress
              value={(progress.reached / progress.total) * 100}
              className="h-2"
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
