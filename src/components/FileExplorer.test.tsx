// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FileExplorer } from "@/components/FileExplorer"

describe("FileExplorer", () => {
  it("renders header actions in the project header", () => {
    const handleClose = vi.fn()

    render(
      <FileExplorer
        tree={[]}
        projectDir="/tmp/project"
        loading={false}
        onToggleFolder={vi.fn()}
        onOpenFile={vi.fn()}
        currentFilePath={null}
        headerAction={
          <button type="button" onClick={handleClose}>
            Close Sidebar
          </button>
        }
      />,
    )

    expect(screen.getByRole("heading", { name: "project" })).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Close Sidebar" }))

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
