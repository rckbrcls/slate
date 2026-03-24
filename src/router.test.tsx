// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { RouterProvider } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

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
  Toolbar: ({ fileName }: { fileName: string }) => <div>{`Toolbar: ${fileName}`}</div>,
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
        const editor = {
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

vi.mock("@/components/AISidePanel", () => ({
  AISidePanel: () => null,
}))

vi.mock("@/components/StatsSidePanel", () => ({
  StatsSidePanel: () => null,
}))

vi.mock("@/components/FileExplorer", () => ({
  FileExplorer: ({ onOpenFile }: { onOpenFile: (path: string) => void }) => (
    <button type="button" onClick={() => void onOpenFile(mocks.clickedPath)}>
      Open Script from Tree
    </button>
  ),
}))

vi.mock("@/components/GitHistory", () => ({
  GitHistory: () => null,
}))

vi.mock("@/components/ui/expandable-screen", () => ({
  ExpandableScreen: ({ children }: { children: ReactNode }) => <>{children}</>,
  ExpandableScreenContent: ({ children }: { children: ReactNode }) => <>{children}</>,
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
  beforeEach(() => {
    vi.resetModules()
    window.location.hash = "#/"
    window.sessionStorage.clear()
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
})
