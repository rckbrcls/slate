import { Node, mergeAttributes } from "@tiptap/core"

export const Action = Node.create({
  name: "action",
  group: "block",
  content: "inline*",

  addAttributes() {
    return {
      centered: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="action"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "action" }),
      0,
    ]
  },
})
