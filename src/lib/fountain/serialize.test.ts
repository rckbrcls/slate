import { describe, it, expect } from "vitest"
import { editorToFountain } from "./serialize"
import { fountainToEditor } from "./deserialize"
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

function roundTrip(fountain: string): string {
  const { content, titlePage } = fountainToEditor(fountain)
  const doc = schema.nodeFromJSON(content)
  return editorToFountain(doc, titlePage)
}

describe("serialize", () => {
  it("should round-trip a basic scene", () => {
    const input = `INT. OFFICE - DAY

Sarah sits at her desk.

SARAH
Hello world.
`
    const output = roundTrip(input)
    expect(output).toContain("INT. OFFICE - DAY")
    expect(output).toContain("Sarah sits at her desk.")
    expect(output).toContain("SARAH")
    expect(output).toContain("Hello world.")
  })

  it("should serialize centered action with correct format", () => {
    const input = `> TITLE CARD <
`
    const output = roundTrip(input)
    expect(output).toContain("> TITLE CARD <")
  })

  it("should round-trip forced scene headings", () => {
    const input = `.FLASHBACK
`
    const output = roundTrip(input)
    expect(output).toContain(".FLASHBACK")
  })

  it("should round-trip forced characters", () => {
    const input = `@McCLANE
Die Hard.
`
    const output = roundTrip(input)
    expect(output).toContain("@MCCLANE")
  })

  it("should round-trip transitions", () => {
    const input = `CUT TO:
`
    const output = roundTrip(input)
    expect(output).toContain("CUT TO:")
  })

  it("should round-trip title page", () => {
    const input = `Title: My Screenplay
Author: John Doe

INT. OFFICE - DAY

Action.
`
    const output = roundTrip(input)
    expect(output).toContain("Title: My Screenplay")
    expect(output).toContain("Author: John Doe")
  })

  it("should serialize page breaks", () => {
    const input = `INT. OFFICE - DAY

Action.

===

EXT. PARK - DAY
`
    const output = roundTrip(input)
    expect(output).toContain("===")
  })

  it("should serialize parentheticals with parens", () => {
    const input = `SARAH
(whispering)
Hello.
`
    const output = roundTrip(input)
    expect(output).toContain("(whispering)")
  })
})

describe("deserialize", () => {
  it("should detect forced scene headings", () => {
    const { content } = fountainToEditor(`.FLASHBACK\n`)
    const node = content.content![0]
    expect(node.type).toBe("sceneHeading")
    expect(node.attrs?.forced).toBe(true)
  })

  it("should detect forced characters", () => {
    const { content } = fountainToEditor(`@McCLANE\nDie Hard.\n`)
    const node = content.content![0]
    expect(node.type).toBe("character")
    expect(node.attrs?.forced).toBe(true)
  })

  it("should parse title page", () => {
    const { titlePage } = fountainToEditor(`Title: My Script\nAuthor: Test\n\nINT. ROOM - DAY\n`)
    expect(titlePage.title).toBe("My Script")
    expect(titlePage.author).toBe("Test")
  })

  it("should parse inline formatting in dialogue", () => {
    const { content } = fountainToEditor(`SARAH\n*whispered* hello\n`)
    // Find dialogue node
    const dialogueNode = content.content!.find((n) => n.type === "dialogue")
    expect(dialogueNode).toBeDefined()
    // Should have content with marks
    const textNodes = dialogueNode!.content!
    expect(textNodes.length).toBeGreaterThan(1) // formatted + plain text
  })

  it("should parse inline formatting in action", () => {
    const { content } = fountainToEditor(`She **slams** the door.\n`)
    const actionNode = content.content![0]
    expect(actionNode.type).toBe("action")
    const textNodes = actionNode.content!
    expect(textNodes.some((n) => n.marks?.some((m) => m.type === "bold"))).toBe(true)
  })
})
