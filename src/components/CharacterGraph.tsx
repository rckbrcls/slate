import { useRef, useEffect } from "react"
import * as d3 from "d3"
import type { CooccurrenceMatrix } from "@/lib/analytics/cooccurrence"
import type { CharacterAnalysis } from "@/lib/analytics/characters"

interface CharacterGraphProps {
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

export function CharacterGraph({ cooccurrence, characters }: CharacterGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || cooccurrence.characters.length === 0) return

    const width = svg.clientWidth || 320
    const height = 280

    // Build nodes
    const maxWords = Math.max(...characters.map((c) => c.wordCount), 1)
    const nodes: GraphNode[] = cooccurrence.characters.map((name) => {
      const char = characters.find((c) => c.name === name)
      return {
        id: name,
        wordCount: char?.wordCount || 1,
      }
    })

    // Build links from co-occurrence matrix
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

    // Clear previous
    d3.select(svg).selectAll("*").remove()

    const svgSelection = d3
      .select(svg)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)

    // Simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(60),
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(25))

    // Links
    const link = svgSelection
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "var(--border)")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", (d) => 1 + (d.weight / maxWeight) * 4)

    // Nodes
    const node = svgSelection
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => 6 + (d.wordCount / maxWords) * 14)
      .attr("fill", "var(--primary)")
      .attr("fill-opacity", 0.7)
      .attr("stroke", "var(--ring)")
      .attr("stroke-width", 1.5)

    // Labels
    const label = svgSelection
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.id)
      .attr("font-size", 9)
      .attr("fill", "var(--muted-foreground)")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -(10 + (d.wordCount / maxWords) * 14))

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

  if (cooccurrence.characters.length === 0) {
    return <p className="px-3 py-4 text-center text-xs text-muted-foreground">No character data</p>
  }

  return <svg ref={svgRef} className="w-full" />
}
