import { useMemo } from "react"
import type { Editor } from "@tiptap/core"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OverviewTab } from "@/components/stats/OverviewTab"
import { CharactersTab } from "@/components/stats/CharactersTab"
import { PacingTab } from "@/components/stats/PacingTab"
import { GraphTab } from "@/components/stats/GraphTab"
import { ReadabilityTab } from "@/components/stats/ReadabilityTab"
import { BeatsTab } from "@/components/stats/BeatsTab"
import { analyzeCharacters } from "@/lib/analytics/characters"
import { analyzePacing } from "@/lib/analytics/pacing"
import { buildCooccurrenceMatrix } from "@/lib/analytics/cooccurrence"
import { analyzeReadability } from "@/lib/analytics/readability"
import { mapBeatsToPages } from "@/lib/analytics/beatsheet"
import type { ScreenplayStats } from "@/lib/stats"
import type { PaginationResult } from "@/lib/pagination"

interface StatsSidePanelProps {
  editor: Editor | null
  stats: ScreenplayStats | null
  pagination: PaginationResult | null
}

export function StatsSidePanel({
  editor,
  stats,
  pagination,
}: StatsSidePanelProps) {
  const characters = useMemo(() => {
    if (!editor) return []
    return analyzeCharacters(editor.state.doc)
  }, [editor?.state.doc])

  const pacingData = useMemo(() => {
    if (!editor || !pagination) return []
    return analyzePacing(editor.state.doc, pagination)
  }, [editor?.state.doc, pagination])

  const cooccurrence = useMemo(() => {
    if (!editor) return { characters: [], matrix: [] }
    return buildCooccurrenceMatrix(editor.state.doc)
  }, [editor?.state.doc])

  const readability = useMemo(() => {
    if (!editor) return null
    return analyzeReadability(editor.state.doc)
  }, [editor?.state.doc])

  const beatMarkers = useMemo(() => {
    if (!stats) return []
    return mapBeatsToPages(stats.pages)
  }, [stats?.pages])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold leading-none">Statistics</h2>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-6">
          <TabsList variant="line" className="h-12 gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="characters">Characters</TabsTrigger>
            <TabsTrigger value="pacing">Pacing</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="readability">Readability</TabsTrigger>
            <TabsTrigger value="beats">Beats</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto w-full max-w-6xl p-6 [&_[data-slot=card]]:rounded-md [&_[data-slot=card]]:bg-card/70 [&_[data-slot=card]]:shadow-none">
            <TabsContent value="overview" className="m-0">
              <OverviewTab stats={stats} pacingData={pacingData} />
            </TabsContent>

            <TabsContent value="characters" className="m-0">
              <CharactersTab characters={characters} totalScenes={stats?.scenes ?? 0} />
            </TabsContent>

            <TabsContent value="pacing" className="m-0">
              <PacingTab data={pacingData} />
            </TabsContent>

            <TabsContent value="graph" className="m-0">
              <GraphTab cooccurrence={cooccurrence} characters={characters} />
            </TabsContent>

            <TabsContent value="readability" className="m-0">
              <ReadabilityTab readability={readability} />
            </TabsContent>

            <TabsContent value="beats" className="m-0">
              <BeatsTab beatMarkers={beatMarkers} currentPages={stats?.pages ?? 0} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
