import type { Node as PmNode } from "@tiptap/pm/model"

export interface CharacterAnalysis {
  name: string
  lineCount: number
  wordCount: number
  sceneAppearances: number[]
  firstAppearance: number
  lastAppearance: number
  avgWordsPerLine: number
  dialoguePercentage: number
}

function countWords(text: string): number {
  if (!text || !text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export function analyzeCharacters(doc: PmNode): CharacterAnalysis[] {
  const characterMap = new Map<
    string,
    {
      lineCount: number
      wordCount: number
      sceneAppearances: Set<number>
      firstAppearance: number
      lastAppearance: number
    }
  >()

  let currentScene = 0
  let currentSpeaker: string | null = null
  let totalDialogueWords = 0

  doc.descendants((node) => {
    const type = node.type.name

    switch (type) {
      case "sceneHeading":
        currentScene++
        currentSpeaker = null
        return false

      case "character": {
        const name = node.textContent
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim()
          .toUpperCase()
        if (!name) return false

        currentSpeaker = name

        if (!characterMap.has(name)) {
          characterMap.set(name, {
            lineCount: 0,
            wordCount: 0,
            sceneAppearances: new Set(),
            firstAppearance: currentScene,
            lastAppearance: currentScene,
          })
        }

        const data = characterMap.get(name)!
        data.sceneAppearances.add(currentScene)
        data.lastAppearance = currentScene
        return false
      }

      case "dialogue": {
        if (!currentSpeaker) return false
        const data = characterMap.get(currentSpeaker)
        if (!data) return false

        data.lineCount++
        const words = countWords(node.textContent)
        data.wordCount += words
        totalDialogueWords += words
        return false
      }

      case "dualDialogue":
      case "dualDialogueColumn":
        return true // descend

      default:
        return false
    }
  })

  return Array.from(characterMap.entries())
    .map(([name, data]) => ({
      name,
      lineCount: data.lineCount,
      wordCount: data.wordCount,
      sceneAppearances: Array.from(data.sceneAppearances).sort((a, b) => a - b),
      firstAppearance: data.firstAppearance,
      lastAppearance: data.lastAppearance,
      avgWordsPerLine: data.lineCount > 0 ? Math.round((data.wordCount / data.lineCount) * 10) / 10 : 0,
      dialoguePercentage: totalDialogueWords > 0 ? Math.round((data.wordCount / totalDialogueWords) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.wordCount - a.wordCount)
}
