import { Extension } from "@tiptap/core"

const TAB_CYCLE: Record<string, string> = {
  sceneHeading: "action",
  action: "character",
  character: "dialogue",
  dialogue: "action",
  parenthetical: "dialogue",
  transition: "sceneHeading",
}

export const ScreenplayKeymap = Extension.create({
  name: "screenplayKeymap",

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { $from } = editor.state.selection
        const currentNode = $from.parent
        const nextType = TAB_CYCLE[currentNode.type.name]

        if (nextType && editor.schema.nodes[nextType]) {
          editor.commands.setNode(nextType)
          return true
        }
        return false
      },

      "Shift-Tab": ({ editor }) => {
        const { $from } = editor.state.selection
        const currentNode = $from.parent

        // Reverse cycle
        const reverseCycle: Record<string, string> = {
          action: "sceneHeading",
          character: "action",
          dialogue: "character",
          parenthetical: "character",
          sceneHeading: "transition",
          transition: "dialogue",
        }

        const nextType = reverseCycle[currentNode.type.name]
        if (nextType && editor.schema.nodes[nextType]) {
          editor.commands.setNode(nextType)
          return true
        }
        return false
      },

      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection
        const currentNode = $from.parent
        const typeName = currentNode.type.name
        const isEmpty = currentNode.textContent.length === 0

        // Character → create dialogue below
        if (typeName === "character" && !isEmpty) {
          editor
            .chain()
            .splitBlock()
            .setNode("dialogue")
            .run()
          return true
        }

        // Dialogue (empty) → create action below
        if (typeName === "dialogue" && isEmpty) {
          editor
            .chain()
            .setNode("action")
            .run()
          return true
        }

        // Dialogue (with text) → new dialogue line
        if (typeName === "dialogue" && !isEmpty && empty) {
          editor
            .chain()
            .splitBlock()
            .setNode("dialogue")
            .run()
          return true
        }

        // Action (empty) → convert to character
        if (typeName === "action" && isEmpty) {
          editor.commands.setNode("character")
          return true
        }

        // Scene heading → create action below
        if (typeName === "sceneHeading" && !isEmpty) {
          editor
            .chain()
            .splitBlock()
            .setNode("action")
            .run()
          return true
        }

        // Transition → create scene heading below
        if (typeName === "transition" && !isEmpty) {
          editor
            .chain()
            .splitBlock()
            .setNode("sceneHeading")
            .run()
          return true
        }

        // Parenthetical → create dialogue below
        if (typeName === "parenthetical" && !isEmpty) {
          editor
            .chain()
            .splitBlock()
            .setNode("dialogue")
            .run()
          return true
        }

        // Default: split and create action
        if (!isEmpty) {
          editor
            .chain()
            .splitBlock()
            .setNode("action")
            .run()
          return true
        }

        return false
      },

      // Open parenthetical shortcut
      "(": ({ editor }) => {
        const { $from } = editor.state.selection
        const currentNode = $from.parent

        // If in dialogue and at the beginning of empty node, switch to parenthetical
        if (
          currentNode.type.name === "dialogue" &&
          currentNode.textContent.length === 0
        ) {
          editor.commands.setNode("parenthetical")
          editor.commands.insertContent("(")
          return true
        }

        return false
      },
    }
  },
})
