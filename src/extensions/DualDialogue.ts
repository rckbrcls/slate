import { Node, mergeAttributes } from "@tiptap/core"

export const DualDialogue = Node.create({
  name: "dualDialogue",
  group: "block",
  content: "dualDialogueColumn dualDialogueColumn",

  parseHTML() {
    return [{ tag: 'div[data-type="dualDialogue"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "dualDialogue" }),
      0,
    ]
  },
})
