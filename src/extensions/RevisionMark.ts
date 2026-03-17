import { Mark, mergeAttributes } from "@tiptap/core"

export const REVISION_COLORS = [
  { name: "White", value: 0, hex: "#ffffff", class: "revision-white" },
  { name: "Blue", value: 1, hex: "#dbeafe", class: "revision-blue" },
  { name: "Pink", value: 2, hex: "#fce7f3", class: "revision-pink" },
  { name: "Yellow", value: 3, hex: "#fef9c3", class: "revision-yellow" },
  { name: "Green", value: 4, hex: "#dcfce7", class: "revision-green" },
  { name: "Goldenrod", value: 5, hex: "#fef3c7", class: "revision-goldenrod" },
  { name: "Buff", value: 6, hex: "#fde68a", class: "revision-buff" },
  { name: "Salmon", value: 7, hex: "#fed7aa", class: "revision-salmon" },
] as const

export type RevisionColorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    revisionMark: {
      setRevisionMark: (color: RevisionColorIndex) => ReturnType
      unsetRevisionMark: () => ReturnType
    }
  }
}

export const RevisionMark = Mark.create({
  name: "revisionMark",

  addAttributes() {
    return {
      revisionColor: {
        default: 1,
        parseHTML: (element) => parseInt(element.getAttribute("data-revision-color") || "1"),
        renderHTML: (attributes) => ({
          "data-revision-color": attributes.revisionColor,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-revision-color]" }]
  },

  renderHTML({ HTMLAttributes, mark }) {
    const colorIdx = mark.attrs.revisionColor as number
    const color = REVISION_COLORS[colorIdx] || REVISION_COLORS[1]
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: `revision-mark ${color.class}`,
        style: `background-color: ${color.hex}; color: #1a1a1a;`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setRevisionMark:
        (color: RevisionColorIndex) =>
        ({ commands }) => {
          return commands.setMark(this.name, { revisionColor: color })
        },
      unsetRevisionMark:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})
