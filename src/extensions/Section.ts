import { Node, mergeAttributes } from "@tiptap/core"

export const Section = Node.create({
  name: "section",
  group: "block",
  content: "text*",

  addAttributes() {
    return {
      level: { default: 1 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="section"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "section" }),
      0,
    ]
  },
})
