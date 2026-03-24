import { useMemo } from "react"
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Legend,
  Bar,
  BarChart,
  ResponsiveContainer,
} from "recharts"
import { motion } from "motion/react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { PacingEntry } from "@/lib/analytics/pacing"

const chartConfig = {
  dialogue: { label: "Dialogue", color: "var(--chart-1)" },
  action: { label: "Action", color: "var(--chart-3)" },
} satisfies ChartConfig

const barConfig = {
  total: { label: "Total Lines", color: "var(--chart-2)" },
} satisfies ChartConfig

interface PacingTabProps {
  data: PacingEntry[]
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

export function PacingTab({ data }: PacingTabProps) {
  const summaryStats = useMemo(() => {
    if (data.length === 0) return null
    let totalDialogue = 0
    let totalAction = 0
    let maxDialoguePage = 1
    let maxDialogueVal = 0
    let maxActionPage = 1
    let maxActionVal = 0

    for (const p of data) {
      const total = p.dialogueLines + p.actionLines
      const dPct = total > 0 ? p.dialogueLines / total : 0
      const aPct = total > 0 ? p.actionLines / total : 0
      totalDialogue += p.dialogueLines
      totalAction += p.actionLines
      if (dPct > maxDialogueVal) {
        maxDialogueVal = dPct
        maxDialoguePage = p.page
      }
      if (aPct > maxActionVal) {
        maxActionVal = aPct
        maxActionPage = p.page
      }
    }

    const total = totalDialogue + totalAction
    return {
      avgDialoguePct: total > 0 ? Math.round((totalDialogue / total) * 100) : 0,
      maxDialoguePage,
      maxActionPage,
    }
  }, [data])

  const chartData = useMemo(
    () =>
      data.map((entry) => {
        const total = entry.dialogueLines + entry.actionLines
        return {
          page: entry.page,
          dialogue: total > 0 ? entry.dialogueLines / total : 0.5,
          action: total > 0 ? entry.actionLines / total : 0.5,
        }
      }),
    [data],
  )

  const sceneBarData = useMemo(() => {
    if (data.length === 0) return []
    return data.map((entry) => ({
      page: `p${entry.page}`,
      dialogue: entry.dialogueLines,
      action: entry.actionLines,
      total: entry.dialogueLines + entry.actionLines,
    }))
  }, [data])

  const totalPages = data.length
  const act1End = Math.round(totalPages * 0.25)
  const act2End = Math.round(totalPages * 0.75)

  if (data.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-8">
        No pacing data
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
      {/* Summary Stats */}
      {summaryStats && (
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
          <Card className="p-0">
            <CardContent className="px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Avg Dialogue</p>
              <p className="text-base font-semibold">{summaryStats.avgDialoguePct}%</p>
            </CardContent>
          </Card>
          <Card className="p-0">
            <CardContent className="px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Most Action</p>
              <p className="text-base font-semibold">p.{summaryStats.maxActionPage}</p>
            </CardContent>
          </Card>
          <Card className="p-0">
            <CardContent className="px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Most Dialogue</p>
              <p className="text-base font-semibold">p.{summaryStats.maxDialoguePage}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Pacing Chart */}
      <motion.div variants={fadeUp}>
        <Card className="p-0">
          <CardContent className="px-4 py-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Dialogue vs Action Intensity
            </p>
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 4, left: 4 }}
              >
                <defs>
                  <linearGradient id="gradDialogue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradAction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="page"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                {act1End > 0 && (
                  <ReferenceLine
                    x={act1End}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{
                      value: "Act 1 | 2",
                      position: "top",
                      fill: "var(--muted-foreground)",
                      fontSize: 9,
                    }}
                  />
                )}
                {act2End > 0 && (
                  <ReferenceLine
                    x={act2End}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{
                      value: "Act 2 | 3",
                      position: "top",
                      fill: "var(--muted-foreground)",
                      fontSize: 9,
                    }}
                  />
                )}
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => `Page ${label}`}
                      formatter={(value) =>
                        `${Math.round(Number(value) * 100)}%`
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="dialogue"
                  stackId="1"
                  stroke="var(--color-dialogue)"
                  fill="url(#gradDialogue)"
                />
                <Area
                  type="monotone"
                  dataKey="action"
                  stackId="1"
                  stroke="var(--color-action)"
                  fill="url(#gradAction)"
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Scene Length Distribution */}
      <motion.div variants={fadeUp}>
        <Separator className="my-1" />
        <Card className="p-0">
          <CardContent className="px-4 py-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Page Density
            </p>
            <ChartContainer config={barConfig} className="h-40 w-full">
              <BarChart
                data={sceneBarData}
                margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="page"
                  tick={{ fontSize: 8 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.floor(sceneBarData.length / 15))}
                />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${value} lines`}
                    />
                  }
                />
                <Bar
                  dataKey="total"
                  fill="var(--chart-2)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={12}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
