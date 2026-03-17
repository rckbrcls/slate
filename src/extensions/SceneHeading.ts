import { Node, mergeAttributes } from "@tiptap/core"

export const SceneHeading = Node.create({
  name: "sceneHeading",
  group: "block",
  content: "text*",

  addAttributes() {
    return {
      intExt: { default: null },
      location: { default: null },
      timeOfDay: { default: null },
      sceneNumber: { default: null },
      forced: { default: false },
      locked: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="sceneHeading"]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const sceneNumber = node.attrs.sceneNumber
    const attrs = mergeAttributes(HTMLAttributes, {
      "data-type": "sceneHeading",
      "data-scene-number": sceneNumber || undefined,
      "data-locked": node.attrs.locked ? "true" : undefined,
    })

    if (sceneNumber) {
      return [
        "div",
        { ...attrs, class: "scene-heading-numbered" },
        ["span", { class: "scene-number scene-number-left", contenteditable: "false" }, sceneNumber],
        ["span", { class: "scene-heading-text" }, 0],
        ["span", { class: "scene-number scene-number-right", contenteditable: "false" }, sceneNumber],
      ]
    }

    return ["div", attrs, 0]
  },
})
