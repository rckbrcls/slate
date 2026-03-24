import { useMemo } from "react"
import {
  Clock,
  FileText,
  Clapperboard,
  Users,
  MessageSquare,
  Maximize2,
  Timer,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
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
import type { ScreenplayStats } from "@/lib/stats"
import { calculateHealthScore } from "@/lib/stats"
import type { PacingEntry } from "@/lib/analytics/pacing"

interface OverviewTabProps {
  stats: ScreenplayStats | null
  pacingData: PacingEntry[]
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function OverviewTab({ stats, pacingData }: OverviewTabProps) {
  const health = useMemo(
    () => (stats ? calculateHealthScore(stats) : null),
    [stats],
  )

  const donutData = useMemo(() => {
    if (!stats) return []
    return [
      { name: "Dialogue", value: stats.dialogueWords },
      { name: "Action", value: stats.actionWords },
    ]
  }, [stats])

  const dialoguePercent = stats
    ? Math.round(stats.dialogueRatio * 100)
    : 0

  const totalDialogueLines = useMemo(
    () => pacingData.reduce((sum, p) => sum + p.dialogueLines, 0),
    [pacingData],
  )

  const longestScene = useMemo(() => {
    if (pacingData.length === 0) return null
    let max = 0
    let maxPage = 0
    for (const p of pacingData) {
      const total = p.dialogueLines + p.actionLines
      if (total > max) {
        max = total
        maxPage = p.page
      }
    }
    return { lines: max, page: maxPage }
  }, [pacingData])

  const avgWordsPerPage = stats && stats.pages > 0
    ? Math.round(stats.words / stats.pages)
    : 0

  if (!stats) {
    return (
      <p className="text-center text-xs text-muted-foreground py-8">
        No data available
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
      {/* Hero Metrics */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
        <Card className="p-0">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="size-3.5" />
              <span className="text-xs">Runtime</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              {stats.pages}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                pages
              </span>
            </p>
            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
              <Clock className="size-3" />
              <span className="text-xs">~{stats.estimatedMinutes} min</span>
            </div>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="size-3.5" />
              <span className="text-xs">Words</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              {stats.words.toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {stats.dialogueWords.toLocaleString()} dialogue
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {stats.actionWords.toLocaleString()} action
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Donut Chart — Dialogue vs Action */}
      <motion.div variants={fadeUp}>
        <Card className="p-0">
          <CardContent className="px-4 py-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Dialogue vs Action
            </p>
            <div className="flex items-center gap-4">
              <div className="relative size-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill="var(--chart-1)" />
                      <Cell fill="var(--chart-3)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{dialoguePercent}%</span>
                  <span className="text-[9px] text-muted-foreground">
                    Dialogue
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: "var(--chart-1)" }}
                  />
                  <span className="text-muted-foreground">Dialogue</span>
                  <span className="font-medium ml-auto">
                    {stats.dialogueWords.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: "var(--chart-3)" }}
                  />
                  <span className="text-muted-foreground">Action</span>
                  <span className="font-medium ml-auto">
                    {stats.actionWords.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secondary Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        <MiniStat
          icon={<Clapperboard className="size-3.5" />}
          label="Scenes"
          value={stats.scenes}
        />
        <MiniStat
          icon={<Users className="size-3.5" />}
          label="Characters"
          value={stats.characters}
        />
        <MiniStat
          icon={<FileText className="size-3.5" />}
          label="Avg Words/Page"
          value={avgWordsPerPage}
        />
        <MiniStat
          icon={<MessageSquare className="size-3.5" />}
          label="Dialogue Lines"
          value={totalDialogueLines}
        />
        <MiniStat
          icon={<Maximize2 className="size-3.5" />}
          label="Densest Page"
          value={longestScene ? `p.${longestScene.page}` : "—"}
        />
        <MiniStat
          icon={<Timer className="size-3.5" />}
          label="Reading Time"
          value={`${Math.ceil(stats.words / 250)}m`}
        />
      </motion.div>

      {/* Health Score */}
      {health && (
        <motion.div variants={fadeUp}>
          <Separator className="my-1" />
          <Card className="p-0">
            <CardContent className="px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Screenplay Health
                </p>
                <span className="text-lg font-bold">{health.score}</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Progress
                      value={health.score}
                      className={`h-2 ${
                        health.score >= 70
                          ? "[&>[data-slot=indicator]]:bg-emerald-500"
                          : health.score >= 40
                            ? "[&>[data-slot=indicator]]:bg-amber-500"
                            : "[&>[data-slot=indicator]]:bg-red-500"
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{health.score}/100</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {health.insights.map((insight) => (
                  <Badge key={insight} variant="secondary" className="text-[10px]">
                    {insight}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <Card className="p-0">
      <CardContent className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
          {icon}
          <span className="text-[10px]">{label}</span>
        </div>
        <p className="text-base font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
