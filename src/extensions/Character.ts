import { Node, mergeAttributes } from "@tiptap/core"

export const Character = Node.create({
  name: "character",
  group: "block",
  content: "text*",

  addAttributes() {
    return {
      extension: { default: null },
      forced: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="character"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "character" }),
      0,
    ]
  },
})
