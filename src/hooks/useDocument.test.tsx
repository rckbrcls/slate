// @vitest-environment jsdom

import { render } from "@testing-library/react"
import { act } from "react"
import type { RefObject } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  watcherCallback: null as null | (() => void | Promise<void>),
  notifySaved: vi.fn(),
  readFountainFile: vi.fn(),
  saveFountainFile: vi.fn(),
  openFountainFile: vi.fn(),
  saveAsFountainFile: vi.fn(),
  editorToFountain: vi.fn(),
  fountainToEditor: vi.fn(),
}))

vi.mock("@/hooks/useFileWatcher", () => ({
  useFileWatcher: (_filePath: string | null, opts: { onExternalChange: () => void | Promise<void> }) => {
    mocks.watcherCallback = opts.onExternalChange
    return { notifySaved: mocks.notifySaved }
  },
}))

vi.mock("@/lib/fileService", () => ({
  openFountainFile: mocks.openFountainFile,
  readFountainFile: mocks.readFountainFile,
  saveFountainFile: mocks.saveFountainFile,
  saveAsFountainFile: mocks.saveAsFountainFile,
}))

vi.mock("@/lib/fountain/serialize", () => ({
  editorToFountain: mocks.editorToFountain,
}))

vi.mock("@/lib/fountain/deserialize", () => ({
  fountainToEditor: mocks.fountainToEditor,
}))

import { useDocument } from "@/hooks/useDocument"

function HookHarness({
  editorRef,
  onChange,
}: {
  editorRef: RefObject<{
    state: { doc: unknown }
    commands: { setContent: (content: unknown) => void }
  } | null>
  onChange: (value: ReturnType<typeof useDocument>) => void
}) {
  const value = useDocument(editorRef as Parameters<typeof useDocument>[0])
  onChange(value)
  return null
}

function getLatestDocument(
  value: ReturnType<typeof useDocument> | null,
): ReturnType<typeof useDocument> {
  expect(value).not.toBeNull()
  return value as ReturnType<typeof useDocument>
}

describe("useDocument external sync", () => {
  beforeEach(() => {
    ;(globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean
    }).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    mocks.watcherCallback = null
    mocks.notifySaved.mockReset()
    mocks.readFountainFile.mockReset()
    mocks.saveFountainFile.mockReset()
    mocks.openFountainFile.mockReset()
    mocks.saveAsFountainFile.mockReset()
    mocks.editorToFountain.mockReset()
    mocks.fountainToEditor.mockReset()
    mocks.saveFountainFile.mockResolvedValue({ ok: true })
    mocks.saveAsFountainFile.mockResolvedValue({ ok: true, data: "/tmp/saved.fountain" })
    mocks.editorToFountain.mockReturnValue("current draft")
    mocks.fountainToEditor.mockImplementation(() => ({
      content: { type: "doc", content: [] },
      titlePage: {},
    }))
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    ;(globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean
    }).IS_REACT_ACT_ENVIRONMENT = false
  })

  it("applies disk changes immediately when the editor is clean", async () => {
    const setContent = vi.fn()
    const editorRef = {
      current: {
        state: { doc: {} },
        commands: { setContent },
      },
    }

    let latest: ReturnType<typeof useDocument> | null = null

    render(
      <HookHarness
        editorRef={editorRef}
        onChange={(value) => {
          latest = value
        }}
      />,
    )

    mocks.readFountainFile
      .mockResolvedValueOnce("initial draft")
      .mockResolvedValueOnce("updated from disk")

    await act(async () => {
      await latest?.openFilePath("/tmp/script.fountain")
    })

    await act(async () => {
      await mocks.watcherCallback?.()
    })

    expect(setContent).toHaveBeenCalledTimes(2)

    expect(getLatestDocument(latest).externalChangePending).toBe(false)
  })

  it("marks externalChangePending when the editor is dirty", async () => {
    const setContent = vi.fn()
    const editorRef = {
      current: {
        state: { doc: {} },
        commands: { setContent },
      },
    }

    let latest: ReturnType<typeof useDocument> | null = null

    render(
      <HookHarness
        editorRef={editorRef}
        onChange={(value) => {
          latest = value
        }}
      />,
    )

    mocks.readFountainFile.mockResolvedValueOnce("initial draft")

    await act(async () => {
      await latest?.openFilePath("/tmp/script.fountain")
    })

    act(() => {
      latest?.markDirty()
    })

    await act(async () => {
      await mocks.watcherCallback?.()
    })

    expect(setContent).toHaveBeenCalledTimes(1)
    expect(getLatestDocument(latest).externalChangePending).toBe(true)
  })
})
