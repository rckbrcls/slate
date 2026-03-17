import { describe, it, expect } from "vitest"
import { editorToFDX } from "./fdx"
import { fountainToEditor } from "@/lib/fountain/deserialize"
import { Schema } from "@tiptap/pm/model"

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

function toFDX(fountain: string) {
  const { content, titlePage } = fountainToEditor(fountain)
  const doc = createDoc(content)
  return editorToFDX(doc, titlePage)
}

describe("editorToFDX", () => {
  it("should produce valid XML structure", () => {
    const fdx = toFDX(`
INT. OFFICE - DAY

Action text.
`)
    expect(fdx).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(fdx).toContain('<FinalDraft DocumentType="Script"')
    expect(fdx).toContain("<Content>")
    expect(fdx).toContain("</Content>")
    expect(fdx).toContain("</FinalDraft>")
  })

  it("should map scene headings correctly", () => {
    const fdx = toFDX(`
INT. OFFICE - DAY
`)
    expect(fdx).toContain('Type="Scene Heading"')
    expect(fdx).toContain("INT. OFFICE - DAY")
  })

  it("should map all element types", () => {
    const fdx = toFDX(`
INT. OFFICE - DAY

The hero enters.

SARAH
(smiling)
Hello there.

> CUT TO:
`)
    expect(fdx).toContain('Type="Scene Heading"')
    expect(fdx).toContain('Type="Action"')
    expect(fdx).toContain('Type="Character"')
    expect(fdx).toContain('Type="Dialogue"')
    expect(fdx).toContain('Type="Parenthetical"')
    expect(fdx).toContain('Type="Transition"')
  })

  it("should escape XML special characters", () => {
    const fdx = toFDX(`
INT. OFFICE - DAY

Tom & Jerry's "great" <adventure>.
`)
    expect(fdx).toContain("&amp;")
    expect(fdx).toContain("&apos;")
    expect(fdx).toContain("&quot;")
    expect(fdx).toContain("&lt;")
    expect(fdx).toContain("&gt;")
  })

  it("should handle dual dialogue with Start/End attributes", () => {
    const doc = createDoc({
      type: "doc",
      content: [
        { type: "sceneHeading", content: [{ type: "text", text: "INT. OFFICE - DAY" }] },
        {
          type: "dualDialogue",
          content: [
            {
              type: "dualDialogueColumn",
              content: [
                { type: "character", content: [{ type: "text", text: "SARAH" }] },
                { type: "dialogue", content: [{ type: "text", text: "Hello." }] },
              ],
            },
            {
              type: "dualDialogueColumn",
              content: [
                { type: "character", content: [{ type: "text", text: "BOB" }] },
                { type: "dialogue", content: [{ type: "text", text: "Hi there." }] },
              ],
            },
          ],
        },
      ],
    })
    const fdx = editorToFDX(doc)
    expect(fdx).toContain('DualDialogue="Start"')
    expect(fdx).toContain('DualDialogue="End"')
    expect(fdx).toContain("SARAH")
    expect(fdx).toContain("BOB")
  })

  it("should serialize title page", () => {
    const fdx = toFDX(`Title: My Script
Credit: Written by
Author: John Doe

INT. OFFICE - DAY
`)
    expect(fdx).toContain("<TitlePage>")
    expect(fdx).toContain("My Script")
    expect(fdx).toContain("John Doe")
  })

  it("should handle character extensions", () => {
    const fdx = toFDX(`
INT. OFFICE - DAY

SARAH (V.O.)
Narrating.
`)
    expect(fdx).toContain("SARAH (V.O.)")
    expect(fdx).toContain('Type="Character"')
  })
})
