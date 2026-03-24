import { useState, useMemo } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CharacterAnalysis } from "@/lib/analytics/characters"

interface CharactersTabProps {
  characters: CharacterAnalysis[]
  totalScenes: number
}

type SortKey =
  | "name"
  | "lineCount"
  | "wordCount"
  | "sceneAppearances"
  | "dialoguePercentage"
  | "avgWordsPerLine"

const rankColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"]
const rankLabels = ["1st", "2nd", "3rd"]

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function CharactersTab({ characters, totalScenes }: CharactersTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>("wordCount")
  const [sortDesc, setSortDesc] = useState(true)

  const top3 = characters.slice(0, 3)
  const heatmapChars = characters.slice(0, 8)

  const sorted = useMemo(() => {
    return [...characters].sort((a, b) => {
      let cmp: number
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "sceneAppearances":
          cmp = a.sceneAppearances.length - b.sceneAppearances.length
          break
        default:
          cmp = (a[sortKey] as number) - (b[sortKey] as number)
      }
      return sortDesc ? -cmp : cmp
    })
  }, [characters, sortKey, sortDesc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc)
    else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDesc ? " ↓" : " ↑") : ""

  if (characters.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-8">
        No characters found
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
      {/* Top-3 Spotlight */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        {top3.map((char, i) => (
          <Card key={char.name} className="p-0 overflow-hidden">
            <div
              className="h-1"
              style={{ backgroundColor: rankColors[i] }}
            />
            <CardContent className="px-3 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                  style={{ color: rankColors[i] }}
                >
                  {rankLabels[i]}
                </Badge>
              </div>
              <p className="text-sm font-semibold truncate">{char.name}</p>
              <div className="mt-1.5 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{char.wordCount} words</span>
                  <span>{char.lineCount} lines</span>
                </div>
                <Progress value={char.dialoguePercentage} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground text-right">
                  {char.dialoguePercentage}% of dialogue
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Scene Presence Heatmap */}
      {totalScenes > 0 && heatmapChars.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="p-0">
            <CardContent className="px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Scene Presence
              </p>
              <TooltipProvider>
                <div className="space-y-1.5">
                  {heatmapChars.map((char) => (
                    <div key={char.name} className="flex items-center gap-2">
                      <span className="text-[10px] font-medium w-20 truncate shrink-0">
                        {char.name}
                      </span>
                      <div className="flex gap-[2px] flex-wrap">
                        {Array.from({ length: Math.min(totalScenes, 60) }, (_, si) => {
                          const sceneNum = si + 1
                          const present = char.sceneAppearances.includes(sceneNum)
                          return (
                            <Tooltip key={si}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`size-2.5 rounded-[2px] ${
                                    present
                                      ? "bg-primary/80"
                                      : "bg-muted"
                                  }`}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Scene {sceneNum}
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <Separator />
      </motion.div>

      {/* Enhanced Table */}
      <motion.div variants={fadeUp}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("name")}
              >
                Name{arrow("name")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort("lineCount")}
              >
                Lines{arrow("lineCount")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort("wordCount")}
              >
                Words{arrow("wordCount")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort("avgWordsPerLine")}
              >
                Avg W/L{arrow("avgWordsPerLine")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort("sceneAppearances")}
              >
                Scenes{arrow("sceneAppearances")}
              </TableHead>
              <TableHead className="w-28">Dialogue %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((char, i) => (
              <TableRow key={char.name} className="hover:bg-muted/50">
                <TableCell>
                  {i < 3 ? (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1 py-0"
                      style={{ color: rankColors[i] }}
                    >
                      {i + 1}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-xs">{char.name}</TableCell>
                <TableCell className="text-right text-xs">{char.lineCount}</TableCell>
                <TableCell className="text-right text-xs">{char.wordCount}</TableCell>
                <TableCell className="text-right text-xs">{char.avgWordsPerLine}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="text-[10px]">
                    {char.sceneAppearances.length}
                  </Badge>
                  {char.firstAppearance !== char.lastAppearance && (
                    <span className="text-[9px] text-muted-foreground ml-1">
                      {char.firstAppearance}–{char.lastAppearance}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={char.dialoguePercentage}
                      className="h-2"
                    />
                    <span className="min-w-8 text-right text-[10px] text-muted-foreground">
                      {char.dialoguePercentage}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </motion.div>
  )
}
