// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FileExplorer } from "@/components/FileExplorer"
import type { FileNode } from "@/hooks/useFileExplorer"

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

  it("opens file context actions and submits rename", async () => {
    const fileNode: FileNode = {
      name: "script.fountain",
      path: "/tmp/project/script.fountain",
      isDirectory: false,
    }
    const handleRename = vi.fn().mockResolvedValue(true)
    const handleDuplicate = vi.fn().mockResolvedValue(true)
    const handleCopyPath = vi.fn()
    const handleReveal = vi.fn()

    render(
      <FileExplorer
        tree={[fileNode]}
        projectDir="/tmp/project"
        loading={false}
        onToggleFolder={vi.fn()}
        onOpenFile={vi.fn()}
        currentFilePath={null}
        onRenameEntry={handleRename}
        onDuplicateFile={handleDuplicate}
        onCopyPath={handleCopyPath}
        onRevealEntry={handleReveal}
        onMoveToTrash={vi.fn()}
      />,
    )

    fireEvent.contextMenu(screen.getByRole("button", { name: "script.fountain" }))

    fireEvent.click(await screen.findByRole("menuitem", { name: /Duplicate/ }))
    expect(handleDuplicate).toHaveBeenCalledWith(fileNode)

    fireEvent.contextMenu(screen.getByRole("button", { name: "script.fountain" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: /Copy Path/ }))
    expect(handleCopyPath).toHaveBeenCalledWith(fileNode)

    fireEvent.contextMenu(screen.getByRole("button", { name: "script.fountain" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: /Reveal in Finder/ }))
    expect(handleReveal).toHaveBeenCalledWith(fileNode)

    fireEvent.contextMenu(screen.getByRole("button", { name: "script.fountain" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: /Rename/ }))

    const input = await screen.findByRole("textbox", { name: "New name" })
    fireEvent.change(input, { target: { value: "renamed.fountain" } })
    fireEvent.click(screen.getByRole("button", { name: "Rename" }))

    await waitFor(() => {
      expect(handleRename).toHaveBeenCalledWith(fileNode, "renamed.fountain")
    })
  })

  it("keeps duplicate off directories and confirms trash", async () => {
    const folderNode: FileNode = {
      name: "drafts",
      path: "/tmp/project/drafts",
      isDirectory: true,
    }
    const handleMoveToTrash = vi.fn().mockResolvedValue(true)

    render(
      <FileExplorer
        tree={[folderNode]}
        projectDir="/tmp/project"
        loading={false}
        onToggleFolder={vi.fn()}
        onOpenFile={vi.fn()}
        currentFilePath={null}
        onRenameEntry={vi.fn()}
        onDuplicateFile={vi.fn()}
        onMoveToTrash={handleMoveToTrash}
      />,
    )

    fireEvent.contextMenu(screen.getByRole("button", { name: "drafts" }))

    expect(screen.queryByRole("menuitem", { name: /Duplicate/ })).toBeNull()

    fireEvent.click(await screen.findByRole("menuitem", { name: /Move to Trash/ }))
    fireEvent.click(await screen.findByRole("button", { name: "Move to Trash" }))

    await waitFor(() => {
      expect(handleMoveToTrash).toHaveBeenCalledWith(folderNode)
    })
  })
})
