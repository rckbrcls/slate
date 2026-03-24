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

export interface HealthScoreResult {
  score: number
  insights: string[]
}

export function calculateHealthScore(stats: ScreenplayStats): HealthScoreResult {
  const insights: string[] = []
  let score = 50 // base

  // Dialogue ratio: ideal 0.45–0.60
  const dr = stats.dialogueRatio
  if (dr >= 0.45 && dr <= 0.60) {
    score += 20
    insights.push("Good dialogue/action balance")
  } else if (dr >= 0.35 && dr <= 0.70) {
    score += 10
    insights.push(dr < 0.45 ? "Slightly action-heavy" : "Slightly dialogue-heavy")
  } else {
    insights.push(dr < 0.35 ? "Very action-heavy — consider more dialogue" : "Very dialogue-heavy — consider more action")
  }

  // Page count: ideal 90–120
  if (stats.pages >= 90 && stats.pages <= 120) {
    score += 20
    insights.push("Feature-length page count")
  } else if (stats.pages >= 70 && stats.pages <= 140) {
    score += 10
    insights.push(stats.pages < 90 ? "Short — could expand story" : "Long — consider trimming")
  } else if (stats.pages > 0) {
    insights.push(stats.pages < 70 ? "Very short screenplay" : "Overlong — needs significant cuts")
  }

  // Characters: ideal 3+
  if (stats.characters >= 3) {
    score += 10
    if (stats.characters >= 5) insights.push("Rich character ensemble")
  } else if (stats.characters > 0) {
    insights.push("Few characters — consider expanding cast")
  }

  // Scenes: ideal 20+
  if (stats.scenes >= 40) {
    score += 10
    insights.push("Well-structured scene count")
  } else if (stats.scenes >= 20) {
    score += 5
  } else if (stats.scenes > 0) {
    insights.push("Few scenes — consider adding more locations")
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    insights,
  }
}
