import { Node, mergeAttributes } from "@tiptap/core"

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-type="pageBreak"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "pageBreak" }),
    ]
  },
})
