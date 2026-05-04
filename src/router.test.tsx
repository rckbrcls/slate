// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { RouterProvider } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const initialDocumentState = {
    fileName: "Untitled",
    isDirty: false,
    filePath: null as string | null,
    titlePage: {},
    error: null as string | null,
    externalChangePending: false,
    contentVersion: 0,
  }
  const initialPaginationState = {
    pageBreaks: [{ afterPos: 42, pageNumber: 1 }],
    totalPages: 2,
  }

  let documentState = initialDocumentState
  let editorText = ""
  let paginationState = initialPaginationState

  const documentListeners = new Set<() => void>()
  const editorListeners = new Set<() => void>()

  return {
    restoredPath: "/tmp/project/restore.fountain",
    clickedPath: "/tmp/project/script.fountain",
    restoredText: "Restored screenplay text.",
    clickedText: "Clicked screenplay text.",
    clearError: vi.fn(),
    markDirty: vi.fn(),
    openFile: vi.fn(),
    openFilePath: vi.fn(),
    saveFile: vi.fn(),
    saveAsFile: vi.fn(),
    reloadFromDisk: vi.fn(),
    newFile: vi.fn(),
    closeProject: vi.fn(),
    updateLastFile: vi.fn(),
    getPaginationSnapshot: () => paginationState,
    setPaginationState: (partial: Partial<typeof initialPaginationState>) => {
      paginationState = { ...paginationState, ...partial }
    },
    resetPaginationState: () => {
      paginationState = initialPaginationState
    },
    getDocumentSnapshot: () => documentState,
    subscribeDocument: (listener: () => void) => {
      documentListeners.add(listener)
      return () => documentListeners.delete(listener)
    },
    setDocumentState: (partial: Partial<typeof initialDocumentState>) => {
      documentState = { ...documentState, ...partial }
      documentListeners.forEach((listener) => listener())
    },
    resetDocumentState: () => {
      documentState = initialDocumentState
      documentListeners.forEach((listener) => listener())
    },
    getEditorSnapshot: () => editorText,
    subscribeEditor: (listener: () => void) => {
      editorListeners.add(listener)
      return () => editorListeners.delete(listener)
    },
    setEditorText: (next: string) => {
      editorText = next
      editorListeners.forEach((listener) => listener())
    },
    resetEditorText: () => {
      editorText = ""
      editorListeners.forEach((listener) => listener())
    },
    getTextForPath: (path: string) => (
      path === "/tmp/project/restore.fountain"
        ? "Restored screenplay text."
        : "Clicked screenplay text."
    ),
  }
})

vi.mock("@/hooks/useDocument", async () => {
  const React = await import("react")

  return {
    useDocument: (editorRef: {
      current: {
      isDestroyed?: boolean
      state: { doc: unknown }
      commands: { setContent: (content: unknown) => void }
      } | null
    }) => {
      const state = React.useSyncExternalStore(
        mocks.subscribeDocument,
        mocks.getDocumentSnapshot,
      )

      return {
        ...state,
        clearError: mocks.clearError,
        consumeProgrammaticContentUpdate: () => false,
        markDirty: mocks.markDirty,
        openFile: mocks.openFile,
        openFilePath: async (path: string) => {
          mocks.openFilePath(path)

          const editor = editorRef.current
          if (!editor || editor.isDestroyed) return false

          const text = mocks.getTextForPath(path)

          editor.commands.setContent({
            type: "doc",
            content: [
              {
                type: "sceneHeading",
                content: [{ type: "text", text: "INT. TEST ROOM - DAY" }],
              },
              {
                type: "action",
                content: [{ type: "text", text }],
              },
            ],
          })

          mocks.setDocumentState({
            fileName: path.split("/").pop() ?? "Untitled",
            filePath: path,
            contentVersion: state.contentVersion + 1,
          })

          return true
        },
        saveFile: mocks.saveFile,
        saveAsFile: mocks.saveAsFile,
        reloadFromDisk: mocks.reloadFromDisk,
        newFile: mocks.newFile,
        closeProject: mocks.closeProject,
      }
    },
  }
})

vi.mock("@/hooks/useProjectStore", () => ({
  useProjectStore: () => ({
    projects: [],
    loading: false,
    addProject: vi.fn(),
    removeProject: vi.fn(),
    updateLastFile: mocks.updateLastFile,
    toggleFavorite: vi.fn(),
    touchProject: vi.fn(),
  }),
}))

vi.mock("@/hooks/useFileExplorer", () => ({
  useFileExplorer: () => ({
    tree: [],
    projectDir: "/tmp/project",
    loading: false,
    toggleFolder: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock("@/hooks/useGit", () => ({
  useGit: () => ({
    isRepo: false,
    status: [],
    log: [],
  }),
}))

vi.mock("@/lib/pagination", () => ({
  paginate: () => mocks.getPaginationSnapshot(),
}))

vi.mock("@/lib/stats", () => ({
  calculateStats: () => null,
}))

vi.mock("@/extensions/PageNumbers", () => ({
  pageNumbersPluginKey: {
    getState: () => mocks.getPaginationSnapshot(),
  },
}))

vi.mock("@/components/Toolbar", () => ({
  Toolbar: ({
    fileName,
    onToggleFileExplorer,
    showFileExplorer,
    onOpenStats,
    showStats,
  }: {
    fileName: string
    onToggleFileExplorer?: () => void
    showFileExplorer?: boolean
    onOpenStats?: () => void
    showStats?: boolean
  }) => (
    <div>
      <div>{`Toolbar: ${fileName}`}</div>
      {onToggleFileExplorer && (
        <button type="button" onClick={onToggleFileExplorer}>
          Toggle Sidebar
        </button>
      )}
      <span data-testid="toolbar-sidebar-state">
        {showFileExplorer ? "expanded" : "collapsed"}
      </span>
      {onOpenStats && (
        <button type="button" onClick={onOpenStats}>
          Statistics
        </button>
      )}
      <span data-testid="toolbar-statistics-state">
        {showStats ? "active" : "inactive"}
      </span>
    </div>
  ),
}))

vi.mock("@/components/Editor", async () => {
  const React = await import("react")

  function textFromContent(value: unknown): string {
    if (!value || typeof value !== "object") return ""

    if ("text" in value && typeof value.text === "string") {
      return value.text
    }

    if (!("content" in value) || !Array.isArray(value.content)) {
      return ""
    }

    return value.content
      .map((child) => textFromContent(child))
      .filter(Boolean)
      .join(" ")
      .trim()
  }

  return {
    Editor: ({
      onEditorReady,
      onEditorDestroy,
    }: {
      onEditorReady?: (editor: unknown) => void
      onEditorDestroy?: (editor: unknown) => void
    }) => {
      const text = React.useSyncExternalStore(
        mocks.subscribeEditor,
        mocks.getEditorSnapshot,
      )

      React.useEffect(() => {
        const editor: {
          isDestroyed: boolean
          state: { doc: unknown }
          commands: { setContent: (content: unknown) => void }
        } = {
          isDestroyed: false,
          state: { doc: {} },
          commands: {
            setContent(content: unknown) {
              editor.state.doc = content
              mocks.setEditorText(textFromContent(content))
            },
          },
        }

        onEditorReady?.(editor)

        return () => {
          editor.isDestroyed = true
          onEditorDestroy?.(editor)
        }
      }, [onEditorDestroy, onEditorReady])

      return <div>{text || "Editor Mock"}</div>
    },
  }
})

vi.mock("@/components/StatsBar", () => ({
  StatsBar: () => null,
}))

vi.mock("@/components/TitlePageView", () => ({
  TitlePageView: () => null,
}))

vi.mock("@/components/StatsSidePanel", () => ({
  StatsSidePanel: () => <div>Statistics Panel</div>,
}))

vi.mock("@/components/FileExplorer", () => ({
  FileExplorer: ({
    onOpenFile,
    headerAction,
  }: {
    onOpenFile: (path: string) => void
    headerAction?: ReactNode
  }) => (
    <div>
      {headerAction}
      <button type="button" onClick={() => void onOpenFile(mocks.clickedPath)}>
        Open Script from Tree
      </button>
    </div>
  ),
}))

vi.mock("@/components/GitHistory", () => ({
  GitHistory: () => null,
}))

vi.mock("@/components/WelcomeScreen", () => ({
  WelcomeScreen: () => <div>Welcome Screen</div>,
}))

vi.mock("sonner", () => ({
  Toaster: () => null,
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe("router hydration", () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
    vi.resetModules()
    window.location.hash = "#/"
    window.sessionStorage.clear()
    window.localStorage.clear()
    mocks.clearError.mockReset()
    mocks.markDirty.mockReset()
    mocks.openFile.mockReset()
    mocks.openFilePath.mockReset()
    mocks.saveFile.mockReset()
    mocks.saveAsFile.mockReset()
    mocks.reloadFromDisk.mockReset()
    mocks.newFile.mockReset()
    mocks.closeProject.mockReset()
    mocks.updateLastFile.mockReset()
    mocks.resetPaginationState()
    mocks.resetDocumentState()
    mocks.resetEditorText()
  })

  it("restores visible editor content when landing on /editor", async () => {
    window.location.hash = "#/editor"
    window.sessionStorage.setItem("slate-editor-session", JSON.stringify({
      activeProjectDir: "/tmp/project",
      filePath: mocks.restoredPath,
    }))

    const { createAppRouter } = await import("@/router")
    const router = createAppRouter()

    const { container } = render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(mocks.openFilePath).toHaveBeenCalledWith(mocks.restoredPath)
    })

    expect(screen.getByText("Toolbar: restore.fountain")).not.toBeNull()
    expect(screen.getByText(new RegExp(mocks.restoredText))).not.toBeNull()
    expect(container.querySelectorAll(".screenplay-page-surface")).toHaveLength(2)
    expect(screen.queryByText("Welcome Screen")).toBeNull()
  })

  it("keeps the clicked file content visible after route rerenders", async () => {
    window.location.hash = "#/editor"
    window.sessionStorage.setItem("slate-editor-session", JSON.stringify({
      activeProjectDir: "/tmp/project",
      filePath: mocks.restoredPath,
    }))

    const { createAppRouter } = await import("@/router")
    const router = createAppRouter()

    const { container } = render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText(new RegExp(mocks.restoredText))).not.toBeNull()
    })

    fireEvent.click(screen.getByRole("button", { name: "Open Script from Tree" }))

    await waitFor(() => {
      expect(mocks.openFilePath).toHaveBeenCalledWith(mocks.clickedPath)
    })

    expect(screen.getByText("Toolbar: script.fountain")).not.toBeNull()
    expect(screen.getByText(new RegExp(mocks.clickedText))).not.toBeNull()
    expect(container.querySelectorAll(".screenplay-page-surface")).toHaveLength(2)

    act(() => {
      mocks.setPaginationState({
        pageBreaks: [
          { afterPos: 42, pageNumber: 1 },
          { afterPos: 84, pageNumber: 2 },
          { afterPos: 126, pageNumber: 3 },
        ],
        totalPages: 4,
      })
      const snapshot = mocks.getDocumentSnapshot()
      mocks.setDocumentState({
        contentVersion: snapshot.contentVersion + 1,
      })
    })

    expect(screen.getByText("Toolbar: script.fountain")).not.toBeNull()
    expect(screen.getByText(new RegExp(mocks.clickedText))).not.toBeNull()
    expect(container.querySelectorAll(".screenplay-page-surface")).toHaveLength(4)
  })

  it("collapses and reopens the file explorer without breaking tree file opens", async () => {
    window.location.hash = "#/editor"
    window.sessionStorage.setItem("slate-editor-session", JSON.stringify({
      activeProjectDir: "/tmp/project",
      filePath: mocks.restoredPath,
    }))

    const { createAppRouter } = await import("@/router")
    const router = createAppRouter()

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText(new RegExp(mocks.restoredText))).not.toBeNull()
    })

    const sidebarPanel = screen.getByTestId("file-explorer-panel")

    expect(sidebarPanel.getAttribute("data-state")).toBe("open")
    expect(screen.getByTestId("toolbar-sidebar-state").textContent).toBe("expanded")
    const resizeHandle = screen.getByRole("separator", { name: "Resize File Explorer" })
    expect(resizeHandle.className).toContain("bg-transparent")
    expect(resizeHandle.childElementCount).toBe(0)

    fireEvent.click(screen.getByRole("button", { name: "Close Sidebar" }))

    expect(sidebarPanel.getAttribute("data-state")).toBe("closed")
    expect(screen.getByTestId("toolbar-sidebar-state").textContent).toBe("collapsed")
    expect(screen.queryByRole("separator", { name: "Resize File Explorer" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }))

    expect(sidebarPanel.getAttribute("data-state")).toBe("open")
    expect(screen.getByTestId("toolbar-sidebar-state").textContent).toBe("expanded")
    expect(screen.getByRole("separator", { name: "Resize File Explorer" })).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Open Script from Tree" }))

    await waitFor(() => {
      expect(mocks.openFilePath).toHaveBeenCalledWith(mocks.clickedPath)
    })

    expect(screen.getByText("Toolbar: script.fountain")).not.toBeNull()
    expect(screen.getByText(new RegExp(mocks.clickedText))).not.toBeNull()
  })

  it("shows statistics as an exclusive editor view", async () => {
    window.location.hash = "#/editor"
    window.sessionStorage.setItem("slate-editor-session", JSON.stringify({
      activeProjectDir: "/tmp/project",
      filePath: mocks.restoredPath,
    }))

    const { createAppRouter } = await import("@/router")
    const router = createAppRouter()

    const { container } = render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText(new RegExp(mocks.restoredText))).not.toBeNull()
    })

    expect(container.querySelector("#editor-file-explorer-layout")).not.toBeNull()
    expect(screen.queryByText("Statistics Panel")).toBeNull()
    expect(screen.getByTestId("toolbar-statistics-state").textContent).toBe("inactive")

    fireEvent.click(screen.getByRole("button", { name: "Statistics" }))

    expect(screen.getByText("Statistics Panel")).not.toBeNull()
    expect(container.querySelector("#editor-file-explorer-layout")).toBeNull()
    expect(screen.queryByText(new RegExp(mocks.restoredText))).toBeNull()
    expect(screen.getByTestId("toolbar-statistics-state").textContent).toBe("active")
  })

  it("restores the persisted file explorer width on editor load", async () => {
    window.location.hash = "#/editor"
    window.localStorage.setItem("slate.editor.fileExplorerWidth.v1", "360")
    window.sessionStorage.setItem("slate-editor-session", JSON.stringify({
      activeProjectDir: "/tmp/project",
      filePath: mocks.restoredPath,
    }))

    const { createAppRouter } = await import("@/router")
    const router = createAppRouter()

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByText(new RegExp(mocks.restoredText))).not.toBeNull()
    })

    const sidebarPanel = screen.getByTestId("file-explorer-panel")

    expect(sidebarPanel.getAttribute("data-state")).toBe("open")
    expect(sidebarPanel.getAttribute("data-sidebar-default-width")).toBe("360")
    expect(screen.getByRole("separator", { name: "Resize File Explorer" })).not.toBeNull()
  })
})
