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
})
