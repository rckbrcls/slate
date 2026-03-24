// @vitest-environment jsdom

import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useEditor: vi.fn(),
  coordsAtPos: vi.fn(() => ({ top: 0, left: 0, bottom: 0 })),
  chainFocus: vi.fn(),
  chainDeleteRange: vi.fn(),
  chainInsertContent: vi.fn(),
  chainRun: vi.fn(),
}))

vi.mock("@tiptap/react", () => ({
  useEditor: mocks.useEditor,
  EditorContent: () => <div>Editor Content</div>,
}))

vi.mock("@/components/AutocompletePopup", () => ({
  AutocompletePopup: () => null,
}))

describe("Editor", () => {
  beforeEach(() => {
    mocks.useEditor.mockReset()
    mocks.coordsAtPos.mockClear()
    mocks.chainFocus.mockReset()
    mocks.chainDeleteRange.mockReset()
    mocks.chainInsertContent.mockReset()
    mocks.chainRun.mockReset()

    mocks.chainFocus.mockReturnValue({
      deleteRange: mocks.chainDeleteRange,
      insertContent: mocks.chainInsertContent,
      run: mocks.chainRun,
    })
    mocks.chainDeleteRange.mockReturnValue({
      insertContent: mocks.chainInsertContent,
      run: mocks.chainRun,
    })
    mocks.chainInsertContent.mockReturnValue({
      run: mocks.chainRun,
    })
    mocks.chainRun.mockReturnValue(true)
  })

  it("registers the live editor instance once and clears it on unmount", async () => {
    const mockEditor = {
      state: {
        selection: { $from: { pos: 1 } },
      },
      view: {
        coordsAtPos: mocks.coordsAtPos,
      },
      chain: () => ({
        focus: mocks.chainFocus,
      }),
    }

    mocks.useEditor.mockReturnValue(mockEditor)

    const { Editor } = await import("@/components/Editor")

    const onEditorReady = vi.fn()
    const onEditorDestroy = vi.fn()

    const { unmount } = render(
      <Editor
        onEditorReady={onEditorReady}
        onEditorDestroy={onEditorDestroy}
      />,
    )

    expect(mocks.useEditor).toHaveBeenCalledTimes(1)
    expect(mocks.useEditor.mock.calls[0]?.[0]?.content).toEqual({
      type: "doc",
      content: [{ type: "sceneHeading" }],
    })
    expect(onEditorReady).toHaveBeenCalledWith(mockEditor)

    unmount()

    expect(onEditorDestroy).toHaveBeenCalledWith(mockEditor)
  })
})
