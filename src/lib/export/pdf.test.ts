import { describe, it, expect } from "vitest"
import { editorToPdfDefinition } from "./pdf"
import { fountainToEditor } from "@/lib/fountain/deserialize"
import { Schema } from "@tiptap/pm/model"
import { PAGE, ELEMENT_STYLES } from "./pdfStyles"

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

function toPdfDef(fountain: string) {
  const { content, titlePage } = fountainToEditor(fountain)
  const doc = createDoc(content)
  return editorToPdfDefinition(doc, titlePage)
}

describe("editorToPdfDefinition", () => {
  it("should set US Letter page size", () => {
    const def = toPdfDef(`INT. OFFICE - DAY\n\nAction.`)
    const size = def.pageSize as { width: number; height: number }
    expect(size.width).toBe(PAGE.width)
    expect(size.height).toBe(PAGE.height)
  })

  it("should set WGA standard margins", () => {
    const def = toPdfDef(`INT. OFFICE - DAY\n\nAction.`)
    const margins = def.pageMargins as number[]
    expect(margins[0]).toBe(PAGE.marginLeft) // 1.5in left
    expect(margins[1]).toBe(PAGE.marginTop)  // 1in top
    expect(margins[2]).toBe(PAGE.marginRight) // 1in right
    expect(margins[3]).toBe(PAGE.marginBottom) // 1in bottom
  })

  it("should use Courier Prime as default font", () => {
    const def = toPdfDef(`INT. OFFICE - DAY`)
    expect(def.defaultStyle?.font).toBe("CourierPrime")
    expect(def.defaultStyle?.fontSize).toBe(12)
  })

  it("should produce content for each element type", () => {
    const def = toPdfDef(`
INT. OFFICE - DAY

The hero enters.

SARAH
(smiling)
Hello there.

> CUT TO:
`)
    const content = def.content as unknown as Array<Record<string, unknown>>
    // Should have: sceneHeading, action, character, parenthetical, dialogue, transition
    expect(content.length).toBeGreaterThanOrEqual(5)
  })

  it("should indent character names", () => {
    const def = toPdfDef(`
INT. OFFICE - DAY

SARAH
Hello.
`)
    const content = def.content as Array<{ text: string; margin?: number[] }>
    const charElement = content.find((c) => c.text === "SARAH")
    expect(charElement).toBeDefined()
    expect(charElement!.margin![0]).toBe(ELEMENT_STYLES.character.marginLeft)
  })

  it("should include title page with page break", () => {
    const def = toPdfDef(`Title: My Script
Credit: Written by
Author: Jane Doe

INT. OFFICE - DAY
`)
    const content = def.content as unknown as Array<Record<string, unknown>>
    // Title page elements + page break + screenplay content
    const hasPageBreak = content.some((c) => c.pageBreak === "after")
    expect(hasPageBreak).toBe(true)
    const titleElement = content.find((c) => c.text === "My Script")
    expect(titleElement).toBeDefined()
  })

  it("should show page numbers starting from page 2", () => {
    const def = toPdfDef(`INT. OFFICE - DAY\n\nAction.`)
    const headerFn = def.header as (page: number) => unknown
    expect(headerFn(1)).toBeNull()
    const page2Header = headerFn(2) as { text: string }
    expect(page2Header.text).toBe("2.")
  })
})
