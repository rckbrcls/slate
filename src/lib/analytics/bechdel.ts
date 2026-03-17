import type { Node as PmNode } from "@tiptap/pm/model"
import nlp from "compromise"

export interface BechdelResult {
  passes: boolean
  criteria: [boolean, boolean, boolean]
  details: string[]
}

/**
 * Bechdel test analysis.
 * Gender is user-tagged (not guessed) — pass a map of character name → gender.
 * Criterion 3 uses compromise NLP to detect references to male characters.
 */
export function bechdelTest(
  doc: PmNode,
  genderMap: Map<string, "male" | "female" | "unknown">,
): BechdelResult {
  const details: string[] = []

  // Criterion 1: At least 2 named female characters
  const femaleChars = new Set<string>()
  const maleChars = new Set<string>()

  for (const [name, gender] of genderMap) {
    if (gender === "female") femaleChars.add(name.toUpperCase())
    if (gender === "male") maleChars.add(name.toUpperCase())
  }

  const criterion1 = femaleChars.size >= 2
  if (criterion1) {
    details.push(`${femaleChars.size} named female characters: ${Array.from(femaleChars).join(", ")}`)
  } else {
    details.push(`Only ${femaleChars.size} named female character(s) identified`)
  }

  if (!criterion1) {
    return {
      passes: false,
      criteria: [false, false, false],
      details,
    }
  }

  // Criterion 2: Do two female characters talk to each other?
  // Track consecutive female speakers within scenes
  type Conversation = { speakers: string[]; dialogues: string[] }
  let criterion2 = false
  const femaleConversations: Conversation[] = []
  let currentSpeaker: string | null = null
  let previousSpeaker: string | null = null
  let currentConversation: Conversation | null = null

  doc.descendants((node) => {
    const type = node.type.name

    switch (type) {
      case "sceneHeading":
        // Reset conversation tracking at scene breaks
        if (currentConversation && currentConversation.speakers.length >= 2) {
          femaleConversations.push(currentConversation)
        }
        currentConversation = null
        previousSpeaker = null
        currentSpeaker = null
        return false

      case "character": {
        previousSpeaker = currentSpeaker
        currentSpeaker = node.textContent
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim()
          .toUpperCase()

        // Check if two different female characters are speaking consecutively
        if (
          currentSpeaker &&
          previousSpeaker &&
          currentSpeaker !== previousSpeaker &&
          femaleChars.has(currentSpeaker) &&
          femaleChars.has(previousSpeaker)
        ) {
          criterion2 = true
          if (!currentConversation) {
            currentConversation = { speakers: [previousSpeaker], dialogues: [] }
          }
          if (!currentConversation.speakers.includes(currentSpeaker)) {
            currentConversation.speakers.push(currentSpeaker)
          }
        }
        return false
      }

      case "dialogue": {
        if (currentConversation && currentSpeaker && femaleChars.has(currentSpeaker)) {
          currentConversation.dialogues.push(node.textContent)
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

  // Push last conversation
  const lastConv = currentConversation as Conversation | null
  if (lastConv && lastConv.speakers.length >= 2) {
    femaleConversations.push(lastConv)
  }

  if (criterion2) {
    details.push("Female characters talk to each other")
  } else {
    details.push("No conversations found between two female characters")
    return {
      passes: false,
      criteria: [true, false, false],
      details,
    }
  }

  // Criterion 3: About something other than a man
  // Use compromise NLP to detect references to male character names
  let criterion3 = false
  const maleNames = Array.from(maleChars)

  for (const conversation of femaleConversations) {
    const allDialogue = conversation.dialogues.join(" ")
    if (!allDialogue.trim()) continue

    // Check if dialogue references any male character
    const doc = nlp(allDialogue)
    const text = doc.text().toLowerCase()

    const referencesMale = maleNames.some((name) =>
      text.includes(name.toLowerCase()),
    )

    if (!referencesMale) {
      criterion3 = true
      details.push(
        `Conversation between ${conversation.speakers.join(" & ")} does not reference male characters`,
      )
      break
    }
  }

  if (!criterion3) {
    // Check if ANY female conversation has non-male-referencing content
    for (const conversation of femaleConversations) {
      const allDialogue = conversation.dialogues.join(" ")
      if (!allDialogue.trim()) continue

      const sentences = allDialogue.split(/[.!?]+/).filter((s) => s.trim())
      const nonMaleSentences = sentences.filter((sentence) => {
        const lower = sentence.toLowerCase()
        return !maleNames.some((name) => lower.includes(name.toLowerCase()))
      })

      if (nonMaleSentences.length > 0) {
        criterion3 = true
        details.push("Some dialogue between female characters is not about male characters")
        break
      }
    }
  }

  if (!criterion3) {
    details.push("All female-to-female dialogue appears to reference male characters")
  }

  return {
    passes: criterion1 && criterion2 && criterion3,
    criteria: [criterion1, criterion2, criterion3],
    details,
  }
}
