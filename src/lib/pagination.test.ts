import { describe, it, expect } from "vitest"
import { paginate, paginateMeasured, paginateIncremental } from "./pagination"
import { fountainToEditor } from "@/lib/fountain/deserialize"
import { Schema } from "@tiptap/pm/model"

// Minimal ProseMirror schema matching our TipTap nodes
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    sceneHeading: {
      group: "block",
      content: "text*",
      attrs: { intExt: { default: null }, location: { default: null }, timeOfDay: { default: null }, sceneNumber: { default: null }, forced: { default: false } },
    },
    action: { group: "block", content: "inline*", attrs: { centered: { default: false } } },
    character: { group: "block", content: "text*", attrs: { extension: { default: null }, forced: { default: false } } },
    dialogue: { group: "block", content: "inline*" },
    parenthetical: { group: "block", content: "text*" },
    transition: { group: "block", content: "text*", attrs: { forced: { default: false } } },
    dualDialogue: { group: "block", content: "dualDialogueColumn dualDialogueColumn" },
    dualDialogueColumn: { content: "block+" },
    pageBreak: { group: "block" },
    section: { group: "block", content: "text*", attrs: { level: { default: 1 } } },
    synopsis: { group: "block", content: "text*" },
    note: { group: "block", content: "text*" },
    hardBreak: { group: "inline", inline: true },
  },
  marks: {
    bold: {},
    italic: {},
    underline: {},
  },
})

function createDoc(jsonContent: Record<string, unknown>) {
  return schema.nodeFromJSON(jsonContent)
}

function makeFountainDoc(fountain: string) {
  const { content } = fountainToEditor(fountain)
  return createDoc(content)
}

function expectBreaksToBeStable(result: ReturnType<typeof paginate>) {
  const keys = result.pageBreaks.map((pageBreak) => `${pageBreak.pageNumber}:${pageBreak.afterPos}`)
  expect(new Set(keys).size).toBe(keys.length)

  for (let i = 1; i < result.pageBreaks.length; i++) {
    expect(result.pageBreaks[i].pageNumber).toBeGreaterThan(result.pageBreaks[i - 1].pageNumber)
    expect(result.pageBreaks[i].afterPos).toBeGreaterThan(result.pageBreaks[i - 1].afterPos)
  }
}

// ── paginate() — sync character-estimate (regression tests) ──

describe("paginate", () => {
  it("should return 1 page for a short document", () => {
    const doc = makeFountainDoc(`
INT. OFFICE - DAY

Sarah sits at her desk.

SARAH
Hello.
`)
    const result = paginate(doc)
    expect(result.totalPages).toBe(1)
    expect(result.pageBreaks).toHaveLength(0)
  })

  it("should create page breaks for long documents", () => {
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    for (let i = 0; i < 60; i++) {
      lines.push(`This is action line number ${i + 1} which is a regular line of action.`)
      lines.push("")
    }
    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginate(doc)
    expect(result.totalPages).toBeGreaterThan(1)
    expect(result.pageBreaks.length).toBeGreaterThan(0)
  })

  it("should handle explicit page breaks", () => {
    const doc = makeFountainDoc(`
INT. OFFICE - DAY

Action.

===

INT. PARK - DAY

More action.
`)
    const result = paginate(doc)
    expect(result.pageBreaks).toHaveLength(1)
    expect(result.pageBreaks[0]).toMatchObject({ pageNumber: 1 })
    expectBreaksToBeStable(result)
  })

  it("should mark MORE/CONT'D when dialogue is split", () => {
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    for (let i = 0; i < 48; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    lines.push("SARAH")
    lines.push("This is a very long speech that should span many lines and hopefully cross a page boundary. ".repeat(5))

    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginate(doc)
    expect(result.totalPages).toBeGreaterThan(1)
  })

  it("should prevent character cue widows", () => {
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    for (let i = 0; i < 50; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    lines.push("SARAH")
    lines.push("Hello there.")

    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginate(doc)
    expect(result.totalPages).toBeGreaterThan(1)
    expectBreaksToBeStable(result)
  })

  it("should return correct total pages", () => {
    const doc = makeFountainDoc(`
INT. OFFICE - DAY

Short scene.
`)
    const result = paginate(doc)
    expect(result.totalPages).toBe(1)
    expect(result.pageBreaks).toEqual([])
  })

  it("should wrap very long unbroken action tokens", () => {
    const doc = makeFountainDoc(`
INT. SERVER ROOM - NIGHT

${"X".repeat(240)}
`)

    const result = paginate(doc)
    expect(result.totalPages).toBeGreaterThanOrEqual(1)
    expect(result.pageBreaks).toEqual([])
  })

  it("should create page breaks for long dialogue after width recalibration", () => {
    const lines: string[] = ["INT. APARTMENT - NIGHT", ""]

    for (let i = 0; i < 42; i++) {
      lines.push(`Action line ${i + 1} keeps the page nearly full.`)
      lines.push("")
    }

    lines.push("SARAH")
    lines.push("This line is deliberately long and repeated to force dialogue wrapping across the narrower column. ".repeat(9))

    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginate(doc)

    expect(result.totalPages).toBeGreaterThan(1)
    expect(result.pageBreaks.length).toBeGreaterThan(0)
    expectBreaksToBeStable(result)
  })

  it("should keep page breaks ordered and unique in mixed pagination scenarios", () => {
    const lines: string[] = ["INT. CONTROL ROOM - NIGHT", ""]

    for (let i = 0; i < 48; i++) {
      lines.push(`Action line ${i + 1} pushes the page near its limit.`)
      lines.push("")
    }

    lines.push("SARAH")
    lines.push("A short line that forces the character cue to move cleanly.")
    lines.push("")
    lines.push("===")
    lines.push("")
    lines.push("INT. LOBBY - DAY")
    lines.push("")
    lines.push("Dialogue keeps going to make pagination work harder.")

    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginate(doc)

    expect(result.pageBreaks.length).toBeGreaterThan(0)
    expectBreaksToBeStable(result)
  })
})

// ── paginateMeasured() — pixel-based measurement ──

// Deterministic mock measure function: returns heights based on node type
function mockMeasure(node: { type: { name: string }; textContent: string }): number {
  const type = node.type.name
  const lineCount = Math.max(1, Math.ceil(node.textContent.length / 50))

  switch (type) {
    case "sceneHeading":
      return 40 // 20px line + 20px margin-top
    case "action":
      return 10 + lineCount * 20 // 10px margin-top + lines
    case "character":
      return 30 // 10px margin-top + 20px line
    case "dialogue":
      return lineCount * 20
    case "parenthetical":
      return lineCount * 20
    case "transition":
      return 30 // 10px margin-top + 20px line
    case "section":
    case "synopsis":
    case "note":
      return 0
    default:
      return 20
  }
}

describe("paginateMeasured", () => {
  const CONTENT_HEIGHT = 864 // matches PAGINATION_LAYOUT.contentHeightPx

  it("should return 1 page for a short document", () => {
    const doc = makeFountainDoc(`
INT. OFFICE - DAY

Sarah sits at her desk.

SARAH
Hello.
`)
    const result = paginateMeasured(doc, mockMeasure, CONTENT_HEIGHT)
    expect(result.totalPages).toBe(1)
    expect(result.pageBreaks).toHaveLength(0)
  })

  it("should break pages based on pixel height", () => {
    // Each action line = 10 + 20 = 30px. At 864px content height, ~28 lines per page.
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    for (let i = 0; i < 40; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginateMeasured(doc, mockMeasure, CONTENT_HEIGHT)

    expect(result.totalPages).toBeGreaterThan(1)
    expect(result.pageBreaks.length).toBeGreaterThan(0)
    expectBreaksToBeStable(result)
  })

  it("should handle explicit page breaks", () => {
    const doc = makeFountainDoc(`
INT. OFFICE - DAY

Action.

===

INT. PARK - DAY

More action.
`)
    const result = paginateMeasured(doc, mockMeasure, CONTENT_HEIGHT)
    expect(result.pageBreaks).toHaveLength(1)
    expect(result.pageBreaks[0]).toMatchObject({ pageNumber: 1 })
  })

  it("should protect against scene heading widows", () => {
    // Fill page to just below capacity, then add a scene heading
    // The scene heading should not be alone at page bottom
    const fixedMeasure = (node: { type: { name: string }; textContent: string }) => {
      if (node.type.name === "sceneHeading") return 40
      if (node.type.name === "action") return 30
      return 20
    }

    // 28 action lines × 30px = 840px, leaving 24px. Scene heading (40px) won't fit alone.
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    for (let i = 0; i < 27; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    lines.push("INT. PARK - DAY")
    lines.push("")
    lines.push("More action here.")

    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginateMeasured(doc, fixedMeasure, CONTENT_HEIGHT)

    expect(result.totalPages).toBeGreaterThan(1)

    // The scene heading should be on page 2, not orphaned at the bottom of page 1
    const breakPos = result.pageBreaks[0].afterPos
    let sceneHeadingPos = -1
    doc.forEach((node, offset) => {
      if (node.type.name === "sceneHeading" && node.textContent.includes("PARK")) {
        sceneHeadingPos = offset
      }
    })
    // Break should be at or before the scene heading
    expect(breakPos).toBeLessThanOrEqual(sceneHeadingPos)
  })

  it("should protect against character orphans", () => {
    const fixedMeasure = (node: { type: { name: string }; textContent: string }) => {
      if (node.type.name === "sceneHeading") return 40
      if (node.type.name === "action") return 30
      if (node.type.name === "character") return 30
      if (node.type.name === "dialogue") return 60
      return 20
    }

    // Fill page to near capacity
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    for (let i = 0; i < 27; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    lines.push("SARAH")
    lines.push("Hello there, how are you doing today?")

    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginateMeasured(doc, fixedMeasure, CONTENT_HEIGHT)

    expect(result.totalPages).toBeGreaterThan(1)
    expectBreaksToBeStable(result)

    // Character should not be alone at the bottom — break should be before it
    let characterPos = -1
    doc.forEach((node, offset) => {
      if (node.type.name === "character") {
        characterPos = offset
      }
    })
    const breakPos = result.pageBreaks[0].afterPos
    expect(breakPos).toBeLessThanOrEqual(characterPos)
  })

  it("should mark MORE/CONT'D for dialogue splits", () => {
    const fixedMeasure = (node: { type: { name: string }; textContent: string }) => {
      if (node.type.name === "sceneHeading") return 40
      if (node.type.name === "action") return 30
      if (node.type.name === "character") return 30
      // Long dialogue: 200px (crosses page boundary)
      if (node.type.name === "dialogue") return 200
      return 20
    }

    // Fill page so there's ~100px left (>= 40px on both sides = splittable)
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    for (let i = 0; i < 25; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    lines.push("SARAH")
    lines.push("A very long speech that spans many many lines and should be split across pages with MORE and CONT'D markers.")

    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginateMeasured(doc, fixedMeasure, CONTENT_HEIGHT)

    expect(result.totalPages).toBeGreaterThan(1)

    // Find the break with MORE/CONT'D
    const moreBreak = result.pageBreaks.find((pb) => pb.more)
    expect(moreBreak).toBeDefined()
    expect(moreBreak?.contdCharacter).toBe("SARAH")
  })

  it("should skip non-printable elements", () => {
    const doc = makeFountainDoc(`
INT. OFFICE - DAY

Action.

= Synopsis text

Action continues.
`)
    const result = paginateMeasured(doc, mockMeasure, CONTENT_HEIGHT)
    expect(result.totalPages).toBe(1)
  })
})

// ── paginateIncremental() ──

describe("paginateIncremental", () => {
  const CONTENT_HEIGHT = 864

  it("should preserve breaks before the change position", () => {
    // Create a 3-page document
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    for (let i = 0; i < 80; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    const doc = makeFountainDoc(lines.join("\n"))

    // Get full measurement first
    const fullResult = paginateMeasured(doc, mockMeasure, CONTENT_HEIGHT)
    expect(fullResult.totalPages).toBeGreaterThanOrEqual(3)

    // Simulate a change late in the document (page 3)
    const page2Break = fullResult.pageBreaks[1]
    const changePos = page2Break.afterPos + 10

    const incrementalResult = paginateIncremental(
      doc,
      mockMeasure,
      CONTENT_HEIGHT,
      fullResult,
      changePos,
    )

    // Pages 1-2 breaks should be preserved
    expect(incrementalResult.pageBreaks[0]).toEqual(fullResult.pageBreaks[0])
    expect(incrementalResult.pageBreaks[1]).toEqual(fullResult.pageBreaks[1])
    expect(incrementalResult.totalPages).toBe(fullResult.totalPages)
  })

  it("should recalculate from the affected page", () => {
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    for (let i = 0; i < 60; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    const doc = makeFountainDoc(lines.join("\n"))

    const fullResult = paginateMeasured(doc, mockMeasure, CONTENT_HEIGHT)

    // Change at the very beginning should recalculate everything
    const incrementalResult = paginateIncremental(
      doc,
      mockMeasure,
      CONTENT_HEIGHT,
      fullResult,
      0,
    )

    expect(incrementalResult.totalPages).toBe(fullResult.totalPages)
    expectBreaksToBeStable(incrementalResult)
  })
})
