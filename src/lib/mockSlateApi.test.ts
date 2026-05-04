import { describe, expect, it } from "vitest"
import { createMockSlateApi } from "@/lib/mockSlateApi"

describe("createMockSlateApi", () => {
  it("reads and writes projects in memory", async () => {
    const api = createMockSlateApi({ storage: null })
    const projects = await api.projects.read()
    const [firstProject] = projects

    expect(projects.length).toBeGreaterThan(0)
    expect(firstProject?.name).toBe("Blackout at Noon")

    const updated = projects.map((project) => (
      project.path === firstProject?.path
        ? { ...project, favorite: false }
        : project
    ))

    await api.projects.write(updated)

    expect(await api.projects.read()).toEqual(updated)
  })

  it("opens a mock directory with a screenplay file", async () => {
    const api = createMockSlateApi({ storage: null })
    const directory = await api.openDirectoryDialog()
    const entries = directory ? await api.readDirectory(directory) : []

    expect(directory).toBe("/mock/slate/showcase-room")
    expect(entries).toContainEqual({
      name: "opening-shot.fountain",
      path: "/mock/slate/showcase-room/opening-shot.fountain",
      isDirectory: false,
      isFile: true,
    })
  })

  it("reads mock Fountain content", async () => {
    const api = createMockSlateApi({ storage: null })
    const filePath = await api.openFileDialog()
    const content = filePath ? await api.readTextFile(filePath) : ""
    const stat = filePath ? await api.statFile(filePath) : null

    expect(filePath).toBe("/mock/slate/showcase-room/opening-shot.fountain")
    expect(content).toContain("INT. WRITERS ROOM - AFTERNOON")
    expect(stat?.isFile).toBe(true)
  })

  it("renames files and folders in the mock tree", async () => {
    const api = createMockSlateApi({ storage: null })

    const renamedFile = await api.renamePath(
      "/mock/slate/showcase-room/opening-shot.fountain",
      "cold-open.fountain",
    )
    expect(renamedFile).toBe("/mock/slate/showcase-room/cold-open.fountain")
    expect(await api.statFile("/mock/slate/showcase-room/opening-shot.fountain")).toBeNull()
    expect(await api.readTextFile(renamedFile)).toContain("INT. WRITERS ROOM - AFTERNOON")

    const renamedFolder = await api.renamePath(
      "/mock/slate/showcase-room/notes",
      "story-notes",
    )
    expect(renamedFolder).toBe("/mock/slate/showcase-room/story-notes")
    expect(await api.statFile("/mock/slate/showcase-room/notes")).toBeNull()
    expect(
      await api.readTextFile("/mock/slate/showcase-room/story-notes/character-pass.fountain"),
    ).toContain("Every character gets one secret")

    const entries = await api.readDirectory("/mock/slate/showcase-room")
    expect(entries.map((entry) => entry.name)).toContain("story-notes")
    expect(entries.map((entry) => entry.name)).toContain("cold-open.fountain")
  })

  it("duplicates files with collision-safe names", async () => {
    const api = createMockSlateApi({ storage: null })

    const firstCopy = await api.duplicateFile(
      "/mock/slate/showcase-room/opening-shot.fountain",
    )
    const secondCopy = await api.duplicateFile(
      "/mock/slate/showcase-room/opening-shot.fountain",
    )

    expect(firstCopy).toBe("/mock/slate/showcase-room/opening-shot copy.fountain")
    expect(secondCopy).toBe("/mock/slate/showcase-room/opening-shot copy 2.fountain")
    expect(await api.readTextFile(firstCopy)).toContain("INT. WRITERS ROOM - AFTERNOON")

    const entries = await api.readDirectory("/mock/slate/showcase-room")
    expect(entries.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "opening-shot copy.fountain",
        "opening-shot copy 2.fountain",
      ]),
    )
  })

  it("moves files and folders out of the mock tree", async () => {
    const api = createMockSlateApi({ storage: null })

    await api.movePathToTrash("/mock/slate/showcase-room/opening-shot.fountain")
    expect(await api.statFile("/mock/slate/showcase-room/opening-shot.fountain")).toBeNull()

    await api.movePathToTrash("/mock/slate/showcase-room/notes")
    expect(await api.statFile("/mock/slate/showcase-room/notes")).toBeNull()
    expect(await api.statFile("/mock/slate/showcase-room/notes/character-pass.fountain")).toBeNull()

    const entries = await api.readDirectory("/mock/slate/showcase-room")
    expect(entries.map((entry) => entry.name)).not.toContain("opening-shot.fountain")
    expect(entries.map((entry) => entry.name)).not.toContain("notes")
  })

  it("validates reveal and copy path against known mock entries", async () => {
    const api = createMockSlateApi({ storage: null })

    await expect(
      api.revealPath("/mock/slate/showcase-room/opening-shot.fountain"),
    ).resolves.toBeUndefined()
    await expect(
      api.copyPathToClipboard("/mock/slate/showcase-room/opening-shot.fountain"),
    ).resolves.toBeUndefined()
    await expect(api.copyPathToClipboard("/mock/slate/missing.fountain")).rejects.toThrow(
      "File or folder not found",
    )
  })
})
