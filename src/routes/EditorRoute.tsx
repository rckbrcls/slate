import { useEffect, useRef, useCallback, useState } from "react"
import type { Editor as TiptapEditor } from "@tiptap/core"
import { useNavigate } from "@tanstack/react-router"
import { usePanelRef, type PanelSize } from "react-resizable-panels"
import { Editor } from "@/components/Editor"
import { ScreenplayPageStack } from "@/components/ScreenplayPageStack"
import { Toolbar } from "@/components/Toolbar"
import type { ScreenplayElementType } from "@/components/Toolbar"
import { StatsBar } from "@/components/StatsBar"
import { TitlePageView } from "@/components/TitlePageView"
import { StatsSidePanel } from "@/components/StatsSidePanel"
import { FileExplorer } from "@/components/FileExplorer"
import { GitHistory } from "@/components/GitHistory"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useFileExplorer } from "@/hooks/useFileExplorer"
import { useProjectStore } from "@/hooks/useProjectStore"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDocument } from "@/hooks/useDocument"
import { useGit } from "@/hooks/useGit"
import { pageNumbersPluginKey } from "@/extensions/PageNumbers"
import { paginate, type PaginationResult } from "@/lib/pagination"
import { calculateStats, type ScreenplayStats } from "@/lib/stats"
import { editorToFDX, generatePDF } from "@/lib/export"
import { readDirectory, saveExportFile, saveBinaryFile } from "@/lib/fileService"
import { getPathDir, isPathInsideDirectory } from "@/lib/slateApi"
import {
  applyAutoNumbering,
  lockSceneNumbers,
  unlockSceneNumbers,
  clearSceneNumbers,
} from "@/lib/production/sceneNumbers"
import { markRevision } from "@/lib/production/revisions"
import type { RevisionColorIndex } from "@/extensions/RevisionMark"
import {
  clearEditorSession,
  hasEditorSession,
  readEditorSession,
  writeEditorSession,
} from "@/lib/editorSession"
import { toast } from "sonner"

function deriveProjectDir(filePath: string | null) {
  return getPathDir(filePath)
}

const SCREENPLAY_EXTENSIONS = new Set(["fountain", "spmd"])
type EditorView = "editor" | "statistics"
const FILE_EXPLORER_DEFAULT_WIDTH = 250
const FILE_EXPLORER_MIN_WIDTH = 220
const FILE_EXPLORER_MAX_WIDTH = 420
const FILE_EXPLORER_WIDTH_STORAGE_KEY = "slate.editor.fileExplorerWidth.v1"

function clampFileExplorerWidth(width: number) {
  return Math.min(
    FILE_EXPLORER_MAX_WIDTH,
    Math.max(FILE_EXPLORER_MIN_WIDTH, Math.round(width)),
  )
}

function readStoredFileExplorerWidth() {
  if (typeof window === "undefined") return FILE_EXPLORER_DEFAULT_WIDTH

  try {
    const storedWidth = window.localStorage.getItem(FILE_EXPLORER_WIDTH_STORAGE_KEY)
    if (!storedWidth) return FILE_EXPLORER_DEFAULT_WIDTH

    const parsedWidth = Number(storedWidth)
    if (!Number.isFinite(parsedWidth)) return FILE_EXPLORER_DEFAULT_WIDTH

    return clampFileExplorerWidth(parsedWidth)
  } catch {
    return FILE_EXPLORER_DEFAULT_WIDTH
  }
}

function writeStoredFileExplorerWidth(width: number) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(
      FILE_EXPLORER_WIDTH_STORAGE_KEY,
      String(clampFileExplorerWidth(width)),
    )
  } catch {
    // Local storage is best-effort; resizing should keep working without it.
  }
}

async function findDefaultScreenplayFile(projectDir: string) {
  try {
    const entries = await readDirectory(projectDir)
    const candidates = entries.filter((entry) => {
      if (entry.isDirectory) return false
      const ext = entry.name.split(".").pop()?.toLowerCase() ?? ""
      return SCREENPLAY_EXTENSIONS.has(ext)
    })

    if (candidates.length === 0) return null

    const preferred = candidates.find((entry) => entry.name === "untitled.fountain")
    if (preferred) {
      return preferred.path
    }

    const [firstCandidate] = [...candidates].sort((a, b) => a.name.localeCompare(b.name))
    return firstCandidate ? firstCandidate.path : null
  } catch {
    return null
  }
}

export function EditorRoute() {
  const navigate = useNavigate()
  const initialSessionRef = useRef(readEditorSession())
  const initialSession = initialSessionRef.current
  const canRestoreSession = hasEditorSession(initialSession)
  const editorRef = useRef<TiptapEditor | null>(null)
  const fileExplorerPanelRef = usePanelRef()
  const initialFileExplorerWidthRef = useRef(readStoredFileExplorerWidth())
  const fileExplorerWidthRef = useRef(initialFileExplorerWidthRef.current)
  const isRouteMountedRef = useRef(true)
  const pendingFileRef = useRef<string | null>(initialSession?.filePath ?? null)
  const restoreAttemptedRef = useRef(false)
  const [activeProjectDir, setActiveProjectDir] = useState<string | null>(
    initialSession?.activeProjectDir ?? null,
  )
  const [editorReady, setEditorReady] = useState(false)
  const [stats, setStats] = useState<ScreenplayStats | null>(null)
  const [pagination, setPagination] = useState<PaginationResult | null>(null)
  const [showTitlePage, setShowTitlePage] = useState(false)
  const [activeView, setActiveView] = useState<EditorView>("editor")
  const [showFileExplorer, setShowFileExplorer] = useState(true)

  const projectStore = useProjectStore()
  const { updateLastFile } = projectStore

  const {
    fileName,
    isDirty,
    filePath,
    titlePage,
    error,
    externalChangePending,
    contentVersion,
    clearError,
    consumeProgrammaticContentUpdate,
    markDirty,
    openFile,
    openFilePath,
    saveFile,
    saveAsFile,
    reloadFromDisk,
    newFile,
    closeProject,
  } = useDocument(editorRef)

  const fileExplorer = useFileExplorer(filePath, activeProjectDir)
  const git = useGit(fileExplorer.projectDir)
  const visualPageCount = Math.max(pagination?.totalPages ?? 1, 1)

  const updateStats = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const paginationResult = pageNumbersPluginKey.getState(editor.state) ?? paginate(editor.state.doc)
    setPagination(paginationResult)
    setStats(calculateStats(editor.state.doc, paginationResult))
  }, [])

  const handleUpdate = useCallback(() => {
    if (consumeProgrammaticContentUpdate()) {
      updateStats()
      return
    }

    markDirty()
    updateStats()
  }, [consumeProgrammaticContentUpdate, markDirty, updateStats])

  const handleToggleFileExplorer = useCallback(() => {
    setShowFileExplorer((visible) => !visible)
  }, [])

  const handleCloseFileExplorer = useCallback(() => {
    setShowFileExplorer(false)
  }, [])

  const handleFileExplorerResize = useCallback((panelSize: PanelSize) => {
    if (panelSize.inPixels <= 0) return

    const nextWidth = clampFileExplorerWidth(panelSize.inPixels)
    fileExplorerWidthRef.current = nextWidth
    writeStoredFileExplorerWidth(nextWidth)
  }, [])

  useEffect(() => {
    return () => {
      isRouteMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const panel = fileExplorerPanelRef.current
    if (!panel) return

    const timeoutId = window.setTimeout(() => {
      if (showFileExplorer) {
        panel.expand()
        panel.resize(fileExplorerWidthRef.current)
        return
      }

      panel.collapse()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fileExplorerPanelRef, showFileExplorer])

  useEffect(() => {
    if (!canRestoreSession) {
      toast.error("No editor session to restore")
      navigate({ to: "/" })
    }
  }, [canRestoreSession, navigate])

  useEffect(() => {
    if (
      filePath &&
      (!activeProjectDir || !isPathInsideDirectory(filePath, activeProjectDir))
    ) {
      setActiveProjectDir(deriveProjectDir(filePath))
    }
  }, [activeProjectDir, filePath])

  useEffect(() => {
    restoreAttemptedRef.current = false
  }, [activeProjectDir])

  useEffect(() => {
    if (activeProjectDir && filePath) {
      updateLastFile(activeProjectDir, filePath)
    }
  }, [activeProjectDir, filePath, updateLastFile])

  useEffect(() => {
    if (activeProjectDir || filePath) {
      writeEditorSession({
        activeProjectDir,
        filePath,
      })
      return
    }

    clearEditorSession()
  }, [activeProjectDir, filePath])

  useEffect(() => {
    if (!editorReady || filePath || restoreAttemptedRef.current) return
    if (!activeProjectDir && !pendingFileRef.current) return

    restoreAttemptedRef.current = true

    void (async () => {
      const pendingFile = pendingFileRef.current

      if (pendingFile) {
        pendingFileRef.current = null
        const restored = await openFilePath(pendingFile)
        if (restored) return
      }

      if (activeProjectDir) {
        const fallbackFile = await findDefaultScreenplayFile(activeProjectDir)
        if (fallbackFile) {
          const restored = await openFilePath(fallbackFile)
          if (restored) {
            setActiveProjectDir((prev) => prev ?? deriveProjectDir(fallbackFile))
            return
          }
        }
      }

      clearEditorSession()
      toast.error("Could not restore a screenplay file for this project")
      navigate({ to: "/" })
    })()
  }, [activeProjectDir, editorReady, filePath, navigate, openFilePath])

  const handleOpenFile = useCallback(async () => {
    const openedPath = await openFile()
    if (!openedPath) return

    setActiveProjectDir((prev) => {
      if (prev && isPathInsideDirectory(openedPath, prev)) return prev
      return deriveProjectDir(openedPath)
    })
  }, [openFile])

  const handleOpenFilePath = useCallback(async (path: string) => {
    const opened = await openFilePath(path)
    if (!opened) return

    setActiveProjectDir((prev) => {
      if (prev && isPathInsideDirectory(path, prev)) return prev
      return deriveProjectDir(path)
    })
  }, [openFilePath])

  const handleEditorReady = useCallback((editor: TiptapEditor) => {
    editorRef.current = editor
    setEditorReady(true)
    updateStats()
  }, [updateStats])

  const handleEditorDestroy = useCallback((editor: TiptapEditor) => {
    if (editorRef.current === editor) {
      editorRef.current = null
    }
    if (isRouteMountedRef.current) {
      setEditorReady(false)
    }
  }, [])

  const handleSaveAsFile = useCallback(async () => {
    const savedPath = await saveAsFile()
    if (!savedPath) return

    setActiveProjectDir((prev) => {
      if (prev && isPathInsideDirectory(savedPath, prev)) return prev
      return deriveProjectDir(savedPath)
    })
  }, [saveAsFile])

  const handleCloseProject = useCallback(async () => {
    if (isDirty) {
      await saveFile()
    }

    closeProject()
    setActiveProjectDir(null)
    clearEditorSession()
    navigate({ to: "/" })
  }, [closeProject, isDirty, navigate, saveFile])

  const handleReloadFromDisk = useCallback(async () => {
    const ok = await reloadFromDisk()
    if (ok) {
      updateStats()
      toast.success("Reloaded from disk")
    }
  }, [reloadFromDisk, updateStats])

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
            void handleOpenFile()
            break
          case "s":
            e.preventDefault()
            if (e.shiftKey) {
              void handleSaveAsFile()
            } else {
              void saveFile()
            }
            break
          case "e":
            e.preventDefault()
            void handleExportPDF()
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleExportPDF, handleOpenFile, handleSaveAsFile, newFile, saveFile])

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

  const handleSetScreenplayElement = useCallback((element: ScreenplayElementType) => {
    const editor = editorRef.current
    if (!editor) return
    editor.chain().focus().setNode(element).run()
  }, [])

  const handleInsertPageBreak = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.chain().focus().insertContent({ type: "pageBreak" }).run()
  }, [])

  const handleSetRevisionColor = useCallback((color: RevisionColorIndex) => {
    const editor = editorRef.current
    if (!editor) return
    markRevision(editor, color)
  }, [])

  useEffect(() => {
    updateStats()
  }, [contentVersion, fileName, updateStats])

  if (!canRestoreSession) {
    return null
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toolbar
        fileName={fileName}
        isDirty={isDirty}
        onNew={newFile}
        onOpen={handleOpenFile}
        onSave={saveFile}
        onSaveAs={handleSaveAsFile}
        onToggleTitlePage={() => setShowTitlePage(!showTitlePage)}
        hasTitlePage={Object.keys(titlePage).length > 0}
        onExportPDF={handleExportPDF}
        onExportFDX={handleExportFDX}
        onOpenStats={() =>
          setActiveView((view) => (view === "statistics" ? "editor" : "statistics"))
        }
        showStats={activeView === "statistics"}
        onToggleFileExplorer={handleToggleFileExplorer}
        showFileExplorer={showFileExplorer}
        onSetScreenplayElement={handleSetScreenplayElement}
        onInsertPageBreak={handleInsertPageBreak}
        onAutoNumber={handleAutoNumber}
        onLockScenes={handleLockScenes}
        onUnlockScenes={handleUnlockScenes}
        onClearNumbers={handleClearNumbers}
        onSetRevisionColor={handleSetRevisionColor}
        onCloseProject={handleCloseProject}
      />

      {error && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 px-3 py-2">
          <AlertDescription className="flex items-center gap-2">
            <span>{error}</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clearError}
              className="ml-auto text-destructive hover:text-destructive"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {externalChangePending && (
        <Alert className="rounded-none border-x-0 border-t-0 px-3 py-2">
          <AlertDescription className="flex items-center gap-2">
            <span>Disk changes are waiting because you still have unsaved edits.</span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => void handleReloadFromDisk()}
              className="ml-auto"
            >
              Reload from Disk
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {activeView === "editor" && (
        <ResizablePanelGroup
          id="editor-file-explorer-layout"
          orientation="horizontal"
          resizeTargetMinimumSize={{ coarse: 28, fine: 8 }}
          className="flex min-h-0 flex-1 overflow-hidden px-3"
        >
          <ResizablePanel
            id="file-explorer-panel"
            panelRef={fileExplorerPanelRef}
            collapsible
            collapsedSize={0}
            defaultSize={initialFileExplorerWidthRef.current}
            minSize={FILE_EXPLORER_MIN_WIDTH}
            maxSize={FILE_EXPLORER_MAX_WIDTH}
            groupResizeBehavior="preserve-pixel-size"
            onResize={handleFileExplorerResize}
            data-state={showFileExplorer ? "open" : "closed"}
            data-sidebar-default-width={initialFileExplorerWidthRef.current}
            className="min-w-0"
          >
            <div className="flex h-full min-w-0 py-3">
              <div
                data-state={showFileExplorer ? "open" : "closed"}
                className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-[opacity,transform,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:pointer-events-none data-[state=closed]:-translate-x-3 data-[state=closed]:border-transparent data-[state=closed]:opacity-0 data-[state=open]:translate-x-0 data-[state=open]:opacity-100"
              >
                <FileExplorer
                  tree={fileExplorer.tree}
                  projectDir={fileExplorer.projectDir}
                  loading={fileExplorer.loading}
                  onToggleFolder={fileExplorer.toggleFolder}
                  onOpenFile={handleOpenFilePath}
                  currentFilePath={filePath}
                  gitStatus={git.isRepo ? git.status : undefined}
                  headerAction={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Close Sidebar"
                      title="Close Sidebar"
                      onClick={handleCloseFileExplorer}
                      className="-mr-1 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                  }
                />
                {git.isRepo && <GitHistory log={git.log} currentFile={filePath} />}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle
            id="file-explorer-resize-handle"
            aria-label="Resize File Explorer"
            aria-hidden={!showFileExplorer}
            disabled={!showFileExplorer}
            withHandle={false}
            className={cn(
              "relative z-10 -mx-1 w-2 bg-transparent transition-[opacity,width] duration-200 after:w-2 hover:bg-transparent",
              !showFileExplorer && "pointer-events-none mx-0 w-0 opacity-0 after:w-0",
            )}
          />

          <ResizablePanel id="editor-content-panel" minSize={0} className="min-w-0">
            <main className="relative flex h-full min-h-0 w-full justify-center overflow-auto bg-background p-8">
              {showTitlePage && (
                <TitlePageView
                  titlePage={titlePage}
                  visible={showTitlePage}
                  onClose={() => setShowTitlePage(false)}
                />
              )}
              <ScreenplayPageStack totalPages={visualPageCount} hidden={showTitlePage}>
                <Editor
                  onUpdate={handleUpdate}
                  onPaginationUpdate={updateStats}
                  onEditorReady={handleEditorReady}
                  onEditorDestroy={handleEditorDestroy}
                />
              </ScreenplayPageStack>
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {activeView === "statistics" && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <StatsSidePanel
            editor={editorRef.current}
            stats={stats}
            pagination={pagination}
          />
        </div>
      )}

      {activeView === "editor" && <StatsBar stats={stats} />}
    </div>
  )
}
