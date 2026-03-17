import type { Editor } from "@tiptap/core"
import type { Node as PmNode } from "@tiptap/pm/model"
import { REVISION_COLORS, type RevisionColorIndex } from "@/extensions/RevisionMark"

export interface RevisionSummary {
  colorIndex: RevisionColorIndex
  colorName: string
  colorHex: string
  markedRanges: number
}

export function markRevision(editor: Editor, color: RevisionColorIndex): boolean {
  return editor.commands.setRevisionMark(color)
}

export function getRevisionHistory(doc: PmNode): RevisionSummary[] {
  const colorCounts = new Map<number, number>()

  doc.descendants((node) => {
    if (node.isText && node.marks) {
      for (const mark of node.marks) {
        if (mark.type.name === "revisionMark") {
          const colorIdx = mark.attrs.revisionColor as number
          colorCounts.set(colorIdx, (colorCounts.get(colorIdx) || 0) + 1)
        }
      }
    }
    return true
  })

  return Array.from(colorCounts.entries())
    .map(([colorIdx, count]) => {
      const color = REVISION_COLORS[colorIdx] || REVISION_COLORS[0]
      return {
        colorIndex: colorIdx as RevisionColorIndex,
        colorName: color.name,
        colorHex: color.hex,
        markedRanges: count,
      }
    })
    .sort((a, b) => a.colorIndex - b.colorIndex)
}
