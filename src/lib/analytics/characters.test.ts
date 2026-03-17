import { describe, it, expect } from "vitest"
import { analyzeCharacters } from "./characters"
import { buildCooccurrenceMatrix } from "./cooccurrence"
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

function createDoc(fountain: string) {
  const { content } = fountainToEditor(fountain)
  return schema.nodeFromJSON(content)
}

describe("analyzeCharacters", () => {
  it("should count lines and words per character", () => {
    const doc = createDoc(`
INT. OFFICE - DAY

SARAH
Hello world.

SARAH
How are you?

BOB
Fine thanks.
`)
    const analysis = analyzeCharacters(doc)
    expect(analysis).toHaveLength(2)

    const sarah = analysis.find((c) => c.name === "SARAH")!
    expect(sarah.lineCount).toBe(2)
    expect(sarah.wordCount).toBe(5) // "Hello world." + "How are you?"

    const bob = analysis.find((c) => c.name === "BOB")!
    expect(bob.lineCount).toBe(1)
    expect(bob.wordCount).toBe(2)
  })

  it("should track scene appearances", () => {
    const doc = createDoc(`
INT. OFFICE - DAY

SARAH
Hello.

EXT. PARK - NIGHT

BOB
Hi.

SARAH
Again.
`)
    const analysis = analyzeCharacters(doc)
    const sarah = analysis.find((c) => c.name === "SARAH")!
    expect(sarah.sceneAppearances).toEqual([1, 2])
    expect(sarah.firstAppearance).toBe(1)
    expect(sarah.lastAppearance).toBe(2)
  })

  it("should calculate dialogue percentage", () => {
    const doc = createDoc(`
INT. OFFICE - DAY

SARAH
One two three four five.

BOB
Six seven eight nine ten.
`)
    const analysis = analyzeCharacters(doc)
    const sarah = analysis.find((c) => c.name === "SARAH")!
    expect(sarah.dialoguePercentage).toBeCloseTo(50, 0)
  })

  it("should strip character extensions", () => {
    const doc = createDoc(`
INT. OFFICE - DAY

SARAH (V.O.)
Narrating.

SARAH
Speaking.
`)
    const analysis = analyzeCharacters(doc)
    expect(analysis).toHaveLength(1)
    expect(analysis[0].name).toBe("SARAH")
    expect(analysis[0].lineCount).toBe(2)
  })

  it("should sort by word count descending", () => {
    const doc = createDoc(`
INT. OFFICE - DAY

SARAH
One word.

BOB
Many many many many words in this line.
`)
    const analysis = analyzeCharacters(doc)
    expect(analysis[0].name).toBe("BOB")
    expect(analysis[1].name).toBe("SARAH")
  })
})

describe("buildCooccurrenceMatrix", () => {
  it("should track co-occurrence across scenes", () => {
    const doc = createDoc(`
INT. OFFICE - DAY

SARAH
Hello.

BOB
Hi.

EXT. PARK - NIGHT

SARAH
Alone.
`)
    const result = buildCooccurrenceMatrix(doc)
    expect(result.characters).toContain("SARAH")
    expect(result.characters).toContain("BOB")

    const sarahIdx = result.characters.indexOf("SARAH")
    const bobIdx = result.characters.indexOf("BOB")
    // They appear together in scene 1
    expect(result.matrix[sarahIdx][bobIdx]).toBe(1)
    expect(result.matrix[bobIdx][sarahIdx]).toBe(1)
  })
})
