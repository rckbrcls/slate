import type { Node as PmNode } from "@tiptap/pm/model"

export interface CooccurrenceMatrix {
  characters: string[]
  matrix: number[][]
}

export function buildCooccurrenceMatrix(doc: PmNode): CooccurrenceMatrix {
  // Collect characters per scene
  const sceneCharacters: Set<string>[] = []
  let currentSceneChars = new Set<string>()

  doc.descendants((node) => {
    const type = node.type.name

    switch (type) {
      case "sceneHeading":
        if (currentSceneChars.size > 0) {
          sceneCharacters.push(currentSceneChars)
        }
        currentSceneChars = new Set()
        return false

      case "character": {
        const name = node.textContent
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim()
          .toUpperCase()
        if (name) currentSceneChars.add(name)
        return false
      }

      case "dualDialogue":
      case "dualDialogueColumn":
        return true

      default:
        return false
    }
  })

  // Push the last scene
  if (currentSceneChars.size > 0) {
    sceneCharacters.push(currentSceneChars)
  }

  // Collect all unique characters
  const allChars = new Set<string>()
  for (const scene of sceneCharacters) {
    for (const char of scene) {
      allChars.add(char)
    }
  }
  const characters = Array.from(allChars).sort()

  // Build NxN co-occurrence matrix
  const n = characters.length
  const charIndex = new Map(characters.map((c, i) => [c, i]))
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  for (const scene of sceneCharacters) {
    const chars = Array.from(scene)
    for (let i = 0; i < chars.length; i++) {
      for (let j = i + 1; j < chars.length; j++) {
        const a = charIndex.get(chars[i])!
        const b = charIndex.get(chars[j])!
        matrix[a][b]++
        matrix[b][a]++
      }
    }
  }

  return { characters, matrix }
}
