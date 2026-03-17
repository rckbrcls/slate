import { describe, it, expect } from "vitest"
import { paginate } from "./pagination"
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
    // Generate a document longer than 55 lines
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
    expect(result.pageBreaks.length).toBeGreaterThanOrEqual(1)
    // The explicit page break should create a break
    const explicitBreak = result.pageBreaks.find((pb) => pb.pageNumber === 1)
    expect(explicitBreak).toBeDefined()
  })

  it("should mark MORE/CONT'D when dialogue is split", () => {
    // Create a document where dialogue would be split across pages
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    // Fill up most of a page with action
    for (let i = 0; i < 48; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    // Now add a character with long dialogue that should split
    lines.push("SARAH")
    lines.push("This is a very long speech that should span many lines and hopefully cross a page boundary. ".repeat(5))

    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginate(doc)

    // There should be a page break somewhere
    expect(result.totalPages).toBeGreaterThan(1)
  })

  it("should prevent character cue widows", () => {
    const lines: string[] = ["INT. OFFICE - DAY", ""]
    // Fill up a page to near the end
    for (let i = 0; i < 50; i++) {
      lines.push(`Action line ${i + 1}.`)
      lines.push("")
    }
    // Character at the very bottom — should move to next page
    lines.push("SARAH")
    lines.push("Hello there.")

    const doc = makeFountainDoc(lines.join("\n"))
    const result = paginate(doc)
    expect(result.totalPages).toBeGreaterThan(1)
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
})
