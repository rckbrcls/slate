import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { CharacterAnalysis } from "@/lib/analytics/characters"

type SortKey = "name" | "lineCount" | "wordCount" | "sceneAppearances" | "dialoguePercentage"

interface CharacterTableProps {
  characters: CharacterAnalysis[]
}

export function CharacterTable({ characters }: CharacterTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("wordCount")
  const [sortDesc, setSortDesc] = useState(true)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const sorted = [...characters].sort((a, b) => {
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

  const arrow = (key: SortKey) => (sortKey === key ? (sortDesc ? " ↓" : " ↑") : "")

  if (characters.length === 0) {
    return <p className="px-3 py-4 text-center text-xs text-muted-foreground">No characters found</p>
  }

  return (
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
            onClick={() => handleSort("sceneAppearances")}
          >
            Scenes{arrow("sceneAppearances")}
          </TableHead>
          <TableHead className="w-32">Dialogue %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((char, i) => (
          <TableRow key={char.name}>
            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
            <TableCell className="font-medium">{char.name}</TableCell>
            <TableCell className="text-right">{char.lineCount}</TableCell>
            <TableCell className="text-right">{char.wordCount}</TableCell>
            <TableCell className="text-right">
              <Badge variant="outline" className="text-xs">
                {char.sceneAppearances.length}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Progress value={char.dialoguePercentage} className="h-1.5" />
                <span className="min-w-8 text-right text-xs text-muted-foreground">
                  {char.dialoguePercentage}%
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
