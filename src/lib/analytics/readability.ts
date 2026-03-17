import type { Node as PmNode } from "@tiptap/pm/model"
import { syllable } from "syllable"

export interface ReadabilityResult {
  overall: ReadabilityScore
  perCharacter: Map<string, ReadabilityScore>
}

export interface ReadabilityScore {
  gradeLevel: number // Flesch-Kincaid Grade Level
  readingEase: number // Flesch Reading Ease (higher = easier)
  wordCount: number
  sentenceCount: number
}

function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  return Math.max(sentences.length, 1)
}

function countSyllables(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.reduce((total, word) => total + syllable(word), 0)
}

function computeScore(text: string): ReadabilityScore {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  if (wordCount === 0) {
    return { gradeLevel: 0, readingEase: 100, wordCount: 0, sentenceCount: 0 }
  }

  const sentenceCount = countSentences(text)
  const syllableCount = countSyllables(text)

  const wordsPerSentence = wordCount / sentenceCount
  const syllablesPerWord = syllableCount / wordCount

  // Flesch-Kincaid Grade Level
  const gradeLevel = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59

  // Flesch Reading Ease
  const readingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord

  return {
    gradeLevel: Math.round(gradeLevel * 10) / 10,
    readingEase: Math.round(readingEase * 10) / 10,
    wordCount,
    sentenceCount,
  }
}

export function analyzeReadability(doc: PmNode): ReadabilityResult {
  let allDialogue = ""
  const characterDialogue = new Map<string, string>()
  let currentSpeaker: string | null = null

  doc.descendants((node) => {
    const type = node.type.name

    switch (type) {
      case "character": {
        currentSpeaker = node.textContent
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim()
          .toUpperCase()
        return false
      }
      case "dialogue": {
        const text = node.textContent
        allDialogue += text + " "
        if (currentSpeaker) {
          const existing = characterDialogue.get(currentSpeaker) || ""
          characterDialogue.set(currentSpeaker, existing + text + " ")
        }
        return false
      }
      case "dualDialogue":
      case "dualDialogueColumn":
        return true
      default:
        return false
    }
  })

  const overall = computeScore(allDialogue)
  const perCharacter = new Map<string, ReadabilityScore>()

  for (const [name, text] of characterDialogue) {
    perCharacter.set(name, computeScore(text))
  }

  return { overall, perCharacter }
}
