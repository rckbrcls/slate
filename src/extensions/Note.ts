import { Node, mergeAttributes } from "@tiptap/core"

export const Note = Node.create({
  name: "note",
  group: "block",
  content: "text*",

  parseHTML() {
    return [{ tag: 'div[data-type="note"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "note" }),
      0,
    ]
  },
})
