import { useEffect, useRef, useCallback, useState } from "react"
import type { Editor as TiptapEditor } from "@tiptap/core"
import { Editor } from "@/components/Editor"
import { Toolbar } from "@/components/Toolbar"
import { StatsBar } from "@/components/StatsBar"
import { TitlePageView } from "@/components/TitlePageView"
import { AISidePanel } from "@/components/AISidePanel"
import { DiffControls } from "@/components/DiffControls"
import { StatsSidePanel } from "@/components/StatsSidePanel"
import { FileExplorer } from "@/components/FileExplorer"
import { useFileExplorer } from "@/hooks/useFileExplorer"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ExpandableScreen, ExpandableScreenContent } from "@/components/ui/expandable-screen"
import { useDocument } from "@/hooks/useDocument"
import { useClaude } from "@/hooks/useClaude"
import { pageNumbersPluginKey } from "@/extensions/PageNumbers"
import { paginate, type PaginationResult } from "@/lib/pagination"
import { calculateStats, type ScreenplayStats } from "@/lib/stats"
import { editorToFDX, generatePDF } from "@/lib/export"
import { saveExportFile, saveBinaryFile } from "@/lib/fileService"
import {
  applyAutoNumbering,
  lockSceneNumbers,
  unlockSceneNumbers,
  clearSceneNumbers,
} from "@/lib/production/sceneNumbers"
import { markRevision } from "@/lib/production/revisions"
import type { RevisionColorIndex } from "@/extensions/RevisionMark"
import { toast } from "sonner"

export function App() {
  const editorRef = useRef<TiptapEditor | null>(null)
  const {
    fileName,
    isDirty,
    filePath,
    titlePage,
    error,
    clearError,
    markDirty,
    openFile,
    saveFile,
    saveAsFile,
    newFile,
  } = useDocument(editorRef)

  const [stats, setStats] = useState<ScreenplayStats | null>(null)
  const [pagination, setPagination] = useState<PaginationResult | null>(null)
  const [showTitlePage, setShowTitlePage] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const claude = useClaude(editorRef, filePath, saveFile)

  const updateStats = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const paginationResult = pageNumbersPluginKey.getState(editor.state) ?? paginate(editor.state.doc)
    setPagination(paginationResult)
    setStats(calculateStats(editor.state.doc, paginationResult))
  }, [])

  const handleEditorReady = useCallback(
    (editor: TiptapEditor) => {
      editorRef.current = editor
      updateStats()
    },
    [updateStats],
  )

  const handleUpdate = useCallback(() => {
    markDirty()
    updateStats()
  }, [markDirty, updateStats])

  const handleExportPDF = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    try {
      const buffer = await generatePDF(editor.state.doc, titlePage)
      const baseName = fileName.replace(/\.[^.]+$/, "")
      const result = await saveBinaryFile(
        buffer,
        [{ name: "PDF", extensions: ["pdf"] }],
        `${baseName}.pdf`,
      )
      if (result.ok) {
        toast.success("PDF exported successfully")
      } else if (result.error !== "cancelled") {
        toast.error(`Export failed: ${result.error}`)
      }
    } catch (err) {
      toast.error(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [fileName, titlePage])

  const handleExportFDX = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    try {
      const fdxContent = editorToFDX(editor.state.doc, titlePage)
      const baseName = fileName.replace(/\.[^.]+$/, "")
      const result = await saveExportFile(
        fdxContent,
        [{ name: "Final Draft", extensions: ["fdx"] }],
        `${baseName}.fdx`,
      )
      if (result.ok) {
        toast.success("FDX exported successfully")
      } else if (result.error !== "cancelled") {
        toast.error(`Export failed: ${result.error}`)
      }
    } catch (err) {
      toast.error(`FDX export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [fileName, titlePage])

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "n":
            e.preventDefault()
            newFile()
            break
          case "o":
            e.preventDefault()
            openFile()
            break
          case "s":
            e.preventDefault()
            if (e.shiftKey) {
              saveAsFile()
            } else {
              saveFile()
            }
            break
          case "e":
            e.preventDefault()
            handleExportPDF()
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [newFile, openFile, saveFile, saveAsFile, handleExportPDF])

  // Production mode handlers
  const handleAutoNumber = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    applyAutoNumbering(editor)
    toast.success("Scenes auto-numbered")
  }, [])

  const handleLockScenes = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    lockSceneNumbers(editor)
    toast.success("Scene numbers locked")
  }, [])

  const handleUnlockScenes = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    unlockSceneNumbers(editor)
    toast.success("Scene numbers unlocked")
  }, [])

  const handleClearNumbers = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    clearSceneNumbers(editor)
    toast.success("Scene numbers cleared")
  }, [])

  const handleSetRevisionColor = useCallback((color: RevisionColorIndex) => {
    const editor = editorRef.current
    if (!editor) return
    markRevision(editor, color)
  }, [])

  // Update stats after file operations
  useEffect(() => {
    updateStats()
  }, [fileName, updateStats])

  return (
    <TooltipProvider>
    <div className="dark flex h-screen flex-col bg-background text-foreground">
      <Toolbar
        fileName={fileName}
        isDirty={isDirty}
        onNew={newFile}
        onOpen={openFile}
        onSave={saveFile}
        onSaveAs={saveAsFile}
        onToggleTitlePage={() => setShowTitlePage(!showTitlePage)}
        hasTitlePage={Object.keys(titlePage).length > 0}
        onExportPDF={handleExportPDF}
        onExportFDX={handleExportFDX}
        onToggleAI={() => setShowAI(!showAI)}
        showAI={showAI}
        onOpenStats={() => setShowStats(true)}
        onAutoNumber={handleAutoNumber}
        onLockScenes={handleLockScenes}
        onUnlockScenes={handleUnlockScenes}
        onClearNumbers={handleClearNumbers}
        onSetRevisionColor={handleSetRevisionColor}
      />

      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="ml-auto text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex flex-1 justify-center overflow-auto bg-muted/30 p-8">
          {showTitlePage && (
            <TitlePageView
              titlePage={titlePage}
              visible={showTitlePage}
              onClose={() => setShowTitlePage(false)}
            />
          )}
          <div className="screenplay-page" style={{ display: showTitlePage ? "none" : undefined }}>
            <Editor onUpdate={handleUpdate} onEditorReady={handleEditorReady} />
          </div>
          {claude.status === "reviewing" && (
            <DiffControls
              hunkCount={claude.diffHunkCount}
              onAcceptAll={claude.acceptAll}
              onRejectAll={claude.rejectAll}
            />
          )}
        </main>

        {showAI && (
          <div className="flex w-[350px] shrink-0 border-l border-border">
            <AISidePanel
              status={claude.status}
              log={claude.log}
              error={claude.error}
              diffHunkCount={claude.diffHunkCount}
              onRunClaude={claude.runClaude}
              onAcceptAll={claude.acceptAll}
              onRejectAll={claude.rejectAll}
            />
          </div>
        )}
      </div>

      <ExpandableScreen
        expanded={showStats}
        onExpandChange={setShowStats}
        layoutId="stats-overlay"
      >
        <ExpandableScreenContent className="bg-background" closeButtonClassName="text-foreground hover:bg-muted">
          <StatsSidePanel
            editor={editorRef.current}
            stats={stats}
            pagination={pagination}
          />
        </ExpandableScreenContent>
      </ExpandableScreen>

      <StatsBar stats={stats} />
      <Toaster />
    </div>
    </TooltipProvider>
  )
}
