import { Node, mergeAttributes } from "@tiptap/core"

export const DualDialogueColumn = Node.create({
  name: "dualDialogueColumn",
  content: "character dialogue+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="dualDialogueColumn"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "dualDialogueColumn" }),
      0,
    ]
  },
})
