import { useMemo } from "react"
import type { Editor } from "@tiptap/core"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CharacterTable } from "@/components/CharacterTable"
import { PacingChart } from "@/components/PacingChart"
import { CharacterGraph } from "@/components/CharacterGraph"
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

export function StatsSidePanel({ editor, stats, pagination }: StatsSidePanelProps) {
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
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold">Statistics</h3>
      </div>

      <Tabs defaultValue="overview" className="flex flex-1 flex-col overflow-hidden">
        <div className="px-6 pt-3">
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="characters">Characters</TabsTrigger>
            <TabsTrigger value="pacing">Pacing</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="readability">Readability</TabsTrigger>
            <TabsTrigger value="beats">Beats</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="m-0 p-6">
            {stats ? (
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Pages" value={stats.pages} />
                <StatCard label="Est. Minutes" value={stats.estimatedMinutes} />
                <StatCard label="Scenes" value={stats.scenes} />
                <StatCard label="Words" value={stats.words.toLocaleString()} />
                <StatCard label="Characters" value={stats.characters} />
                <StatCard
                  label="Dialogue Ratio"
                  value={`${Math.round(stats.dialogueRatio * 100)}%`}
                />
                <StatCard label="Action Words" value={stats.actionWords.toLocaleString()} />
                <StatCard label="Dialogue Words" value={stats.dialogueWords.toLocaleString()} />
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">No data</p>
            )}
          </TabsContent>

          <TabsContent value="characters" className="m-0 p-6">
            <CharacterTable characters={characters} />
          </TabsContent>

          <TabsContent value="pacing" className="m-0 p-6">
            <p className="mb-3 text-sm text-muted-foreground">
              Dialogue vs Action intensity per page
            </p>
            <div className="h-96">
              <PacingChart data={pacingData} />
            </div>
          </TabsContent>

          <TabsContent value="graph" className="m-0 p-6">
            <p className="mb-3 text-sm text-muted-foreground">
              Character co-occurrence (size = words, links = shared scenes)
            </p>
            <div className="h-[500px]">
              <CharacterGraph cooccurrence={cooccurrence} characters={characters} />
            </div>
          </TabsContent>

          <TabsContent value="readability" className="m-0 p-6">
            {readability ? (
              <div className="space-y-3">
                <Card className="p-0">
                  <CardHeader className="px-3 pt-2 pb-1">
                    <p className="text-xs font-medium">Overall Dialogue</p>
                  </CardHeader>
                  <CardContent className="px-3 pb-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Grade Level</p>
                        <p className="font-semibold">{readability.overall.gradeLevel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reading Ease</p>
                        <p className="font-semibold">{readability.overall.readingEase}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {readability.overall.readingEase >= 60
                        ? "Good — accessible dialogue"
                        : readability.overall.readingEase >= 30
                          ? "Moderate — somewhat complex"
                          : "Complex — consider simplifying"}
                    </p>
                  </CardContent>
                </Card>

                {readability.perCharacter.size > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Per Character</p>
                    {Array.from(readability.perCharacter.entries())
                      .sort(([, a], [, b]) => b.wordCount - a.wordCount)
                      .slice(0, 10)
                      .map(([name, score]) => (
                        <div key={name} className="flex items-center justify-between rounded px-2 py-1 text-xs">
                          <span className="font-medium">{name}</span>
                          <span className="text-muted-foreground">
                            Grade {score.gradeLevel} / Ease {score.readingEase}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">No readability data</p>
            )}
          </TabsContent>

          <TabsContent value="beats" className="m-0 p-6">
            {beatMarkers.length > 0 ? (
              <div className="space-y-1">
                <p className="mb-2 text-xs text-muted-foreground">
                  Save the Cat! beat sheet for {stats?.pages || 0} pages
                </p>
                {beatMarkers.map((beat) => (
                  <div
                    key={beat.name}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs"
                  >
                    <span className="font-medium">
                      <span
                        className="mr-1.5 inline-block size-2 rounded-full"
                        style={{
                          backgroundColor:
                            beat.act === 1 ? "#60a5fa" : beat.act === 2 ? "#4ade80" : "#f87171",
                        }}
                      />
                      {beat.name}
                    </span>
                    <span className="text-muted-foreground">p. {beat.targetPage}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">No beat data</p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-0">
      <CardHeader className="px-3 pt-2 pb-0">
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent className="px-3 pt-0 pb-2">
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
