import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, FilePlus2, LoaderCircle } from "lucide-react"
import type {
  AnalysisProgress,
  AnalysisRun,
  DocumentVersion,
  IntelligenceProject,
  NormalizedDocument,
  VersionComparison,
} from "../../electron/shared/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComparisonView } from "@/components/intelligence/ComparisonView"
import { DocumentReader } from "@/components/intelligence/DocumentReader"
import { MetricOverview } from "@/components/intelligence/MetricOverview"
import { getSlateApi } from "@/lib/slateApi"
import {
  ANALYSIS_PACKS,
  compareDocumentVersions,
  getDocumentAnalysis,
  getDocumentAsset,
  getNormalizedDocument,
  importDocumentVersion,
  listDocumentVersions,
  openIntelligenceProject,
  setProjectAnalysisPack,
} from "@/lib/intelligenceApi"
import { clearIntelligenceSession, readIntelligenceSession } from "@/lib/intelligenceSession"

const DOCUMENT_FILTERS = [
  { name: "Supported Documents", extensions: ["pdf", "docx", "md", "markdown", "txt", "fountain"] },
]

function versionDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

export function ProjectRoute() {
  const navigate = useNavigate()
  const session = useMemo(readIntelligenceSession, [])
  const [project, setProject] = useState<IntelligenceProject | null>(null)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState("")
  const [document, setDocument] = useState<NormalizedDocument | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisRun | null>(null)
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [baseVersionId, setBaseVersionId] = useState("")
  const [targetVersionId, setTargetVersionId] = useState("")
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTimeline = useCallback(async (projectPath: string) => {
    const nextVersions = await listDocumentVersions(projectPath)
    setVersions(nextVersions)
    setSelectedVersionId((current) => current || nextVersions[0]?.id || "")
    setTargetVersionId((current) => current || nextVersions[0]?.id || "")
    setBaseVersionId((current) => current || nextVersions[1]?.id || nextVersions[0]?.id || "")
  }, [])

  useEffect(() => {
    if (!session) {
      navigate({ to: "/" })
      return
    }
    Promise.all([openIntelligenceProject(session.projectPath), loadTimeline(session.projectPath)])
      .then(([loadedProject]) => setProject(loadedProject))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setLoading(false))
  }, [loadTimeline, navigate, session])

  useEffect(() => {
    if (!project || !selectedVersionId) {
      setDocument(null)
      setAnalysis(null)
      setPdfData(null)
      return
    }
    let active = true
    setLoading(true)
    Promise.all([
      getNormalizedDocument(project.path, selectedVersionId),
      getDocumentAnalysis(project.path, selectedVersionId, project.analysisPack),
    ])
      .then(async ([nextDocument, nextAnalysis]) => {
        if (!active) return
        setDocument(nextDocument)
        setAnalysis(nextAnalysis)
        if (nextDocument.metadata.sourceFormat === "pdf") {
          const asset = await getDocumentAsset(project.path, selectedVersionId)
          if (active) setPdfData(new Uint8Array(asset))
        } else {
          setPdfData(null)
        }
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [project, selectedVersionId])

  useEffect(() => getSlateApi().intelligence.onProgress(setProgress), [])

  useEffect(() => {
    if (!project || versions.length < 2 || !baseVersionId || !targetVersionId || baseVersionId === targetVersionId) {
      setComparison(null)
      return
    }
    let active = true
    setComparisonLoading(true)
    compareDocumentVersions(project.path, baseVersionId, targetVersionId)
      .then((result) => active && setComparison(result))
      .catch((caught: unknown) => active && setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => active && setComparisonLoading(false))
    return () => { active = false }
  }, [baseVersionId, project, targetVersionId, versions.length])

  async function importVersion() {
    if (!project) return
    const sourcePath = await getSlateApi().openFileDialog({ filters: DOCUMENT_FILTERS })
    if (!sourcePath) return
    const requestId = crypto.randomUUID()
    setError(null)
    setProgress({ requestId, stage: "normalizing", percent: 1, message: "Preparing import" })
    try {
      const result = await importDocumentVersion({ requestId, projectPath: project.path, sourcePath })
      await loadTimeline(project.path)
      setSelectedVersionId(result.version.id)
      setTargetVersionId(result.version.id)
      setProgress(null)
    } catch (caught) {
      setProgress(null)
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  async function changePack(packId: string) {
    if (!project) return
    setLoading(true)
    try {
      const updated = await setProjectAnalysisPack(project.path, packId)
      setProject(updated)
      setComparison(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }

  function closeProject() {
    clearIntelligenceSession()
    navigate({ to: "/" })
  }

  if (!session || (!project && loading)) {
    return <div className="grid h-screen place-items-center bg-background text-sm text-muted-foreground">Opening project...</div>
  }
  if (!project) {
    return <div className="grid h-screen place-items-center bg-background p-8 text-center text-sm text-destructive">{error ?? "Project unavailable."}</div>
  }

  const selectedVersion = versions.find((version) => version.id === selectedVersionId)

  return (
    <main className="flex h-screen min-h-0 flex-col bg-background text-foreground">
      <div className="app-drag-region h-10 shrink-0 border-b border-border" />
      <header className="app-no-drag flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={closeProject} aria-label="Back to projects"><ArrowLeft className="size-4" /></Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{project.name}</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{versions.length} immutable {versions.length === 1 ? "version" : "versions"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={project.analysisPack} onValueChange={changePack}>
            <SelectTrigger className="w-44 rounded-md bg-input" size="sm"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-md bg-popover">
              {ANALYSIS_PACKS.map((pack) => <SelectItem key={pack.id} value={pack.id}>{pack.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={importVersion} disabled={Boolean(progress)}>
            {progress ? <LoaderCircle className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}
            Import Version
          </Button>
        </div>
      </header>

      {progress && (
        <div className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-4 border-b border-border bg-card px-5 py-3">
          <div>
            <div className="mb-2 flex justify-between text-[11px]"><span>{progress.message}</span><span className="font-mono text-muted-foreground">{progress.percent}%</span></div>
            <Progress value={progress.percent} className="h-1" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => getSlateApi().intelligence.cancel(progress.requestId)}>Cancel</Button>
        </div>
      )}

      {error && <div role="alert" className="shrink-0 border-b border-destructive/40 bg-card px-5 py-2 text-xs text-destructive">{error}</div>}

      <div className="grid min-h-0 flex-1 grid-cols-[210px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-auto border-r border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Version timeline</p>
          </div>
          {versions.length === 0 ? (
            <div className="px-5 py-8 text-xs leading-5 text-muted-foreground">Import the first version to establish a baseline.</div>
          ) : versions.map((version) => (
            <button
              type="button"
              key={version.id}
              onClick={() => setSelectedVersionId(version.id)}
              className={`relative block w-full border-b border-border px-5 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${version.id === selectedVersionId ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
            >
              {version.id === selectedVersionId && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
              <span className="font-mono text-[10px] uppercase text-primary">Version {version.ordinal}</span>
              <span className="mt-1 block truncate text-xs font-medium text-current">{version.sourceName}</span>
              <span className="mt-2 block text-[10px]">{versionDate(version.importedAt)}</span>
            </button>
          ))}
        </aside>

        <section className="min-h-0 overflow-auto">
          {versions.length === 0 ? (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <p className="font-heading text-2xl">Create the baseline</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Import a textual PDF, DOCX, Markdown, text, or Fountain file. Slate will preserve the original and measure it without editing.</p>
                <Button className="mt-6" onClick={importVersion}><FilePlus2 className="size-4" />Import First Version</Button>
              </div>
            </div>
          ) : loading || !document || !analysis ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">Analyzing {selectedVersion?.sourceName ?? "version"}...</div>
          ) : (
            <Tabs defaultValue="overview" className="flex min-h-full gap-0">
              <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center border-b border-border bg-background px-7">
                <TabsList variant="line" className="h-12 gap-5">
                  <TabsTrigger value="overview" className="px-0">Overview</TabsTrigger>
                  <TabsTrigger value="document" className="px-0">Document</TabsTrigger>
                  <TabsTrigger value="compare" className="px-0">Compare</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="overview" className="m-0"><MetricOverview analysis={analysis} comparison={comparison?.targetVersionId === selectedVersionId ? comparison : null} /></TabsContent>
              <TabsContent value="document" className="m-0 min-h-[calc(100vh-10.5rem)]"><DocumentReader document={document} analysis={analysis} pdfData={pdfData} /></TabsContent>
              <TabsContent value="compare" className="m-0"><ComparisonView versions={versions} baseVersionId={baseVersionId} targetVersionId={targetVersionId} onBaseChange={setBaseVersionId} onTargetChange={setTargetVersionId} comparison={comparison} loading={comparisonLoading} /></TabsContent>
            </Tabs>
          )}
        </section>
      </div>
    </main>
  )
}
