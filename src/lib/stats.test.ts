import { describe, it, expect } from "vitest"
import { calculateStats } from "./stats"
import { paginate } from "./pagination"
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

function getStats(fountain: string) {
  const { content } = fountainToEditor(fountain)
  const doc = createDoc(content)
  const pagination = paginate(doc)
  return calculateStats(doc, pagination)
}

describe("calculateStats", () => {
  it("should count scenes", () => {
    const stats = getStats(`
INT. OFFICE - DAY

Action.

EXT. PARK - NIGHT

More action.
`)
    expect(stats.scenes).toBe(2)
  })

  it("should count words in action and dialogue separately", () => {
    const stats = getStats(`
INT. OFFICE - DAY

The quick brown fox.

SARAH
Hello world today.
`)
    expect(stats.actionWords).toBe(4) // "The quick brown fox."
    expect(stats.dialogueWords).toBe(3) // "Hello world today."
    expect(stats.words).toBe(7)
  })

  it("should count unique characters", () => {
    const stats = getStats(`
INT. OFFICE - DAY

SARAH
Hello.

BOB
Hi.

SARAH
How are you?
`)
    expect(stats.characters).toBe(2) // SARAH and BOB
  })

  it("should estimate 1 minute per page", () => {
    const stats = getStats(`
INT. OFFICE - DAY

Short scene.
`)
    expect(stats.estimatedMinutes).toBe(stats.pages)
  })

  it("should calculate dialogue ratio", () => {
    const stats = getStats(`
INT. OFFICE - DAY

One two three four.

SARAH
One two three four.
`)
    expect(stats.dialogueRatio).toBeCloseTo(0.5, 1)
  })
})
