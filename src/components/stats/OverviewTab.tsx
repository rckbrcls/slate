import { useMemo } from "react"
import {
  Clock,
  FileText,
  Clapperboard,
  Users,
  MessageSquare,
  Maximize2,
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
      className="space-y-3"
    >
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3">
        <MetricCard
          icon={<FileText className="size-3.5" />}
          label="Pages"
          value={stats.pages}
          meta={`~${stats.estimatedMinutes} min`}
        />
        <MetricCard
          icon={<MessageSquare className="size-3.5" />}
          label="Words"
          value={stats.words.toLocaleString()}
          meta={`${stats.dialogueWords.toLocaleString()} dialogue`}
        />
        <MetricCard
          icon={<Clapperboard className="size-3.5" />}
          label="Scenes"
          value={stats.scenes}
          meta={`${stats.characters} characters`}
        />
        <MetricCard
          icon={<Clock className="size-3.5" />}
          label="Reading Time"
          value={`${Math.ceil(stats.words / 250)}m`}
          meta={`${avgWordsPerPage} words/page`}
        />
      </motion.div>

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

      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3">
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
      </motion.div>

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
                          ? "[&>[data-slot=progress-indicator]]:bg-primary"
                          : health.score >= 40
                            ? "[&>[data-slot=progress-indicator]]:bg-chart-3"
                            : "[&>[data-slot=progress-indicator]]:bg-destructive"
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

function MetricCard({
  icon,
  label,
  value,
  meta,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  meta: string
}) {
  return (
    <Card className="p-0">
      <CardContent className="px-3 py-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-[10px] font-medium uppercase">{label}</span>
        </div>
        <p className="text-xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{meta}</p>
      </CardContent>
    </Card>
  )
}
