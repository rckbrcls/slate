import type { Node as PmNode } from "@tiptap/pm/model"
import type { PaginationResult } from "./pagination"

export interface ScreenplayStats {
  pages: number
  estimatedMinutes: number
  scenes: number
  words: number
  dialogueWords: number
  actionWords: number
  dialogueRatio: number // 0-1
  characters: number
}

function countWords(text: string): number {
  if (!text || !text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export function calculateStats(
  doc: PmNode,
  pagination: PaginationResult,
): ScreenplayStats {
  let scenes = 0
  let words = 0
  let dialogueWords = 0
  let actionWords = 0
  const characterNames = new Set<string>()

  doc.descendants((node) => {
    const typeName = node.type.name
    const text = node.textContent

    switch (typeName) {
      case "sceneHeading":
        scenes++
        return false

      case "action": {
        const w = countWords(text)
        words += w
        actionWords += w
        return false
      }

      case "dialogue": {
        const w = countWords(text)
        words += w
        dialogueWords += w
        return false
      }

      case "character": {
        const name = text
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim()
          .toUpperCase()
        if (name) characterNames.add(name)
        return false
      }

      case "dualDialogue":
      case "dualDialogueColumn":
        return true // descend into children

      default:
        return false
    }
  })

  const totalContentWords = dialogueWords + actionWords
  const dialogueRatio = totalContentWords > 0 ? dialogueWords / totalContentWords : 0

  return {
    pages: pagination.totalPages,
    estimatedMinutes: pagination.totalPages, // 1 page ≈ 1 minute (industry standard)
    scenes,
    words,
    dialogueWords,
    actionWords,
    dialogueRatio,
    characters: characterNames.size,
  }
}
