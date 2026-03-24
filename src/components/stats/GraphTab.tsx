import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { motion } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import type { CooccurrenceMatrix } from "@/lib/analytics/cooccurrence"
import type { CharacterAnalysis } from "@/lib/analytics/characters"

interface GraphTabProps {
  cooccurrence: CooccurrenceMatrix
  characters: CharacterAnalysis[]
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  wordCount: number
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  weight: number
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function updateTooltip(
  el: HTMLDivElement,
  name: string,
  wordCount: number,
  connections: number,
  lineCount?: number,
  scenes?: number,
) {
  // Clear previous content safely
  while (el.firstChild) el.removeChild(el.firstChild)

  const nameEl = document.createElement("div")
  nameEl.className = "font-medium"
  nameEl.textContent = name
  el.appendChild(nameEl)

  const infoEl = document.createElement("div")
  infoEl.className = "text-muted-foreground"
  infoEl.textContent = `${wordCount} words · ${connections} connections`
  el.appendChild(infoEl)

  if (lineCount !== undefined && scenes !== undefined) {
    const detailEl = document.createElement("div")
    detailEl.className = "text-muted-foreground"
    detailEl.textContent = `${lineCount} lines · ${scenes} scenes`
    el.appendChild(detailEl)
  }
}

export function GraphTab({ cooccurrence, characters }: GraphTabProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const renderGraph = useCallback(() => {
    const svg = svgRef.current
    if (!svg || cooccurrence.characters.length === 0) return

    const width = svg.clientWidth || 320
    const height = 400

    const maxWords = Math.max(...characters.map((c) => c.wordCount), 1)
    const nodes: GraphNode[] = cooccurrence.characters.map((name) => {
      const char = characters.find((c) => c.name === name)
      return { id: name, wordCount: char?.wordCount || 1 }
    })

    const links: GraphLink[] = []
    for (let i = 0; i < cooccurrence.characters.length; i++) {
      for (let j = i + 1; j < cooccurrence.characters.length; j++) {
        const weight = cooccurrence.matrix[i][j]
        if (weight > 0) {
          links.push({
            source: cooccurrence.characters[i],
            target: cooccurrence.characters[j],
            weight,
          })
        }
      }
    }
    const maxWeight = Math.max(...links.map((l) => l.weight), 1)

    d3.select(svg).selectAll("*").remove()

    const svgSel = d3
      .select(svg)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)

    // Container group for zoom/pan
    const g = svgSel.append("g")

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    svgSel.call(zoom)

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(70),
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30))

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "var(--muted-foreground)")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", (d) => 1 + (d.weight / maxWeight) * 4)

    // Nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => 6 + (d.wordCount / maxWords) * 16)
      .attr("fill", (_, i) => CHART_COLORS[i % CHART_COLORS.length])
      .attr("fill-opacity", 0.7)
      .attr("stroke", "var(--border)")
      .attr("stroke-width", 1.5)
      .style("cursor", "grab")

    // Tooltip interaction
    node
      .on("mouseenter", (event, d) => {
        const tooltip = tooltipRef.current
        if (!tooltip) return
        const charData = characters.find((c) => c.name === d.id)
        const connections = links.filter(
          (l) =>
            (l.source as GraphNode).id === d.id ||
            (l.target as GraphNode).id === d.id,
        ).length
        updateTooltip(
          tooltip,
          d.id,
          d.wordCount,
          connections,
          charData?.lineCount,
          charData?.sceneAppearances.length,
        )
        tooltip.style.opacity = "1"
        tooltip.style.left = `${event.offsetX + 12}px`
        tooltip.style.top = `${event.offsetY - 12}px`
      })
      .on("mouseleave", () => {
        const tooltip = tooltipRef.current
        if (tooltip) tooltip.style.opacity = "0"
      })

    // Drag behavior
    const drag = d3
      .drag<SVGCircleElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    node.call(drag)

    // Labels
    const label = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.id)
      .attr("font-size", 9)
      .attr("fill", "var(--foreground)")
      .attr("fill-opacity", 0.8)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -(10 + (d.wordCount / maxWords) * 16))
      .style("pointer-events", "none")

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!)
      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!)
      label.attr("x", (d) => d.x!).attr("y", (d) => d.y!)
    })

    return () => {
      simulation.stop()
    }
  }, [cooccurrence, characters])

  useEffect(() => {
    return renderGraph()
  }, [renderGraph])

  if (cooccurrence.characters.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-8">
        No character data
      </p>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      <Card className="p-0">
        <CardContent className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <p className="text-xs font-medium text-muted-foreground">
              Character Co-occurrence
            </p>
            <div className="flex items-center gap-3 ml-auto text-[9px] text-muted-foreground">
              <span>Circle size = word count</span>
              <span>Line thickness = shared scenes</span>
            </div>
          </div>
          <div className="relative">
            <svg ref={svgRef} className="w-full" />
            <div
              ref={tooltipRef}
              className="absolute pointer-events-none bg-popover border border-border rounded-md px-2 py-1.5 text-xs shadow-md opacity-0 transition-opacity z-10"
              style={{ maxWidth: 200 }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
