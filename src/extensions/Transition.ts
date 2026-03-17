import { Node, mergeAttributes } from "@tiptap/core"

export const Transition = Node.create({
  name: "transition",
  group: "block",
  content: "text*",

  addAttributes() {
    return {
      forced: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="transition"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "transition" }),
      0,
    ]
  },
})
