import { Area, AreaChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { PacingEntry } from "@/lib/analytics/pacing"

const chartConfig = {
  dialogue: {
    label: "Dialogue",
    color: "var(--chart-1)",
  },
  action: {
    label: "Action",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

interface PacingChartProps {
  data: PacingEntry[]
}

export function PacingChart({ data }: PacingChartProps) {
  if (data.length === 0) {
    return <p className="px-3 py-4 text-center text-xs text-muted-foreground">No pacing data</p>
  }

  // Normalize data for stacked area chart
  const chartData = data.map((entry) => {
    const total = entry.dialogueLines + entry.actionLines
    return {
      page: entry.page,
      dialogue: total > 0 ? entry.dialogueLines / total : 0.5,
      action: total > 0 ? entry.actionLines / total : 0.5,
    }
  })

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
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
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Page ${label}`}
              formatter={(value) => `${Math.round(Number(value) * 100)}%`}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="dialogue"
          stackId="1"
          stroke="var(--color-dialogue)"
          fill="var(--color-dialogue)"
          fillOpacity={0.4}
        />
        <Area
          type="monotone"
          dataKey="action"
          stackId="1"
          stroke="var(--color-action)"
          fill="var(--color-action)"
          fillOpacity={0.4}
        />
      </AreaChart>
    </ChartContainer>
  )
}
