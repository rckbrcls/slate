import { Node, mergeAttributes } from "@tiptap/core"

export const Synopsis = Node.create({
  name: "synopsis",
  group: "block",
  content: "text*",

  parseHTML() {
    return [{ tag: 'div[data-type="synopsis"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "synopsis" }),
      0,
    ]
  },
})
