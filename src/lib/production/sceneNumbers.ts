import type { Editor } from "@tiptap/core"
import type { Node as PmNode } from "@tiptap/pm/model"

/**
 * Auto-number all scene headings sequentially (1, 2, 3, ...)
 */
export function autoNumberScenes(doc: PmNode): Map<number, string> {
  const numbers = new Map<number, string>()
  let sceneCount = 0

  doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading") {
      sceneCount++
      numbers.set(pos, String(sceneCount))
    }
    return false
  })

  return numbers
}

/**
 * Insert a scene number between two existing scenes.
 * E.g., between scene 1 and 2, returns "1A".
 * Between 1A and 2, returns "1B".
 */
export function insertSceneNumber(
  beforeNumber: string,
  afterNumber: string,
): string {
  void afterNumber

  // Extract numeric prefix and optional letter suffix
  const beforeMatch = beforeNumber.match(/^(\d+)([A-Z]*)$/)
  if (!beforeMatch) return beforeNumber + "A"

  const baseNum = beforeMatch[1]
  const suffix = beforeMatch[2]

  if (suffix) {
    // Already has a letter suffix — increment it
    const lastChar = suffix.charCodeAt(suffix.length - 1)
    if (lastChar < 90) {
      // 'Z' = 90
      return baseNum + suffix.slice(0, -1) + String.fromCharCode(lastChar + 1)
    }
    // Overflow: append A
    return baseNum + suffix + "A"
  }

  // No suffix — add "A"
  return baseNum + "A"
}

/**
 * Apply auto-numbering to all scene headings in the editor.
 */
export function applyAutoNumbering(editor: Editor): void {
  const numbers = autoNumberScenes(editor.state.doc)

  editor.chain().command(({ tr }) => {
    numbers.forEach((number, pos) => {
      const node = tr.doc.nodeAt(pos)
      if (node && node.type.name === "sceneHeading") {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          sceneNumber: number,
        })
      }
    })
    return true
  }).run()
}

/**
 * Lock all scene numbers (prevent auto-renumbering).
 */
export function lockSceneNumbers(editor: Editor): void {
  editor.chain().command(({ tr }) => {
    tr.doc.descendants((node, pos) => {
      if (node.type.name === "sceneHeading" && node.attrs.sceneNumber) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          locked: true,
        })
      }
      return false
    })
    return true
  }).run()
}

/**
 * Unlock all scene numbers.
 */
export function unlockSceneNumbers(editor: Editor): void {
  editor.chain().command(({ tr }) => {
    tr.doc.descendants((node, pos) => {
      if (node.type.name === "sceneHeading") {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          locked: false,
        })
      }
      return false
    })
    return true
  }).run()
}

/**
 * Clear all scene numbers.
 */
export function clearSceneNumbers(editor: Editor): void {
  editor.chain().command(({ tr }) => {
    tr.doc.descendants((node, pos) => {
      if (node.type.name === "sceneHeading") {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          sceneNumber: null,
          locked: false,
        })
      }
      return false
    })
    return true
  }).run()
}
