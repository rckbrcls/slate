import type { Node as PmNode } from "@tiptap/pm/model"
import type { PaginationResult } from "@/lib/pagination"

export interface PacingEntry {
  page: number
  dialogueLines: number
  actionLines: number
  intensity: number // 0 = all dialogue, 1 = all action
}

export function analyzePacing(doc: PmNode, pagination: PaginationResult): PacingEntry[] {
  const totalPages = pagination.totalPages
  const pageData: Map<number, { dialogue: number; action: number }> = new Map()

  // Initialize all pages
  for (let i = 1; i <= totalPages; i++) {
    pageData.set(i, { dialogue: 0, action: 0 })
  }

  // Build position → page mapping from page breaks
  const breakPositions = pagination.pageBreaks
    .map((b) => ({ pos: b.afterPos, page: b.pageNumber }))
    .sort((a, b) => a.pos - b.pos)

  function getPageForPos(pos: number): number {
    for (const bp of breakPositions) {
      if (pos < bp.pos) return bp.page
    }
    return totalPages
  }

  // Walk the document and accumulate counts per page
  doc.forEach((node, offset) => {
    const nodePos = offset + 1
    const page = getPageForPos(nodePos)
    const data = pageData.get(page)
    if (!data) return

    const type = node.type.name
    const text = node.textContent
    const lineCount = Math.max(1, Math.ceil(text.length / 60)) // rough estimate

    switch (type) {
      case "action":
        data.action += lineCount
        break
      case "dialogue":
        data.dialogue += lineCount
        break
      case "dualDialogue":
        // Count dialogue inside dual dialogue
        node.descendants((child) => {
          if (child.type.name === "dialogue") {
            data.dialogue += Math.max(1, Math.ceil(child.textContent.length / 35))
          }
          return child.type.name === "dualDialogueColumn"
        })
        break
    }
  })

  return Array.from(pageData.entries())
    .sort(([a], [b]) => a - b)
    .map(([page, data]) => {
      const total = data.dialogue + data.action
      return {
        page,
        dialogueLines: data.dialogue,
        actionLines: data.action,
        intensity: total > 0 ? data.action / total : 0.5,
      }
    })
}
