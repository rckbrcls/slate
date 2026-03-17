import { Node } from "@tiptap/core"

export const ScreenplayDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",
})
