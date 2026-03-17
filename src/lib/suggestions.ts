import type { Node as PmNode } from "@tiptap/pm/model"

export const SLUGLINE_PREFIXES = [
  "INT.",
  "EXT.",
  "INT./EXT.",
  "I/E.",
  "EST.",
] as const

export const TIME_OF_DAY = [
  "DAY",
  "NIGHT",
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "DAWN",
  "DUSK",
  "LATER",
  "CONTINUOUS",
  "MOMENTS LATER",
  "DIA",
  "NOITE",
  "MANHÃ",
  "TARDE",
  "ENTARDECER",
  "AMANHECER",
] as const

export const TRANSITIONS = [
  "CUT TO:",
  "FADE IN:",
  "FADE OUT.",
  "FADE TO:",
  "DISSOLVE TO:",
  "SMASH CUT TO:",
  "MATCH CUT TO:",
  "JUMP CUT TO:",
  "IRIS IN:",
  "IRIS OUT:",
  "WIPE TO:",
  "TIME CUT:",
] as const

export function getCharacterNames(doc: PmNode): string[] {
  const names = new Set<string>()

  doc.descendants((node) => {
    if (node.type.name === "character" && node.textContent.trim()) {
      // Strip extensions like (V.O.), (O.S.), etc.
      const name = node.textContent
        .replace(/\s*\([^)]*\)\s*$/, "")
        .trim()
        .toUpperCase()
      if (name) names.add(name)
    }
    return true
  })

  return Array.from(names).sort()
}

export function getLocations(doc: PmNode): string[] {
  const locations = new Set<string>()

  doc.descendants((node) => {
    if (node.type.name === "sceneHeading" && node.textContent.trim()) {
      // Extract location from scene heading: "INT. LOCATION - TIME"
      const match = node.textContent.match(
        /^(?:INT\.?\/EXT\.?|INT\.?|EXT\.?|EST\.?|I\/E\.?)\s+(.+?)(?:\s*-\s*.+)?$/i,
      )
      if (match?.[1]) {
        locations.add(match[1].trim().toUpperCase())
      }
    }
    return true
  })

  return Array.from(locations).sort()
}

export function getSuggestions(
  doc: PmNode,
  nodeType: string,
  query: string,
): string[] {
  const q = query.toUpperCase()

  switch (nodeType) {
    case "character": {
      const names = getCharacterNames(doc)
      return names.filter((name) => name.startsWith(q) && name !== q)
    }

    case "sceneHeading": {
      // Suggest prefixes if empty or starting to type
      if (!query || query.length < 3) {
        return SLUGLINE_PREFIXES.filter((p) =>
          p.toUpperCase().startsWith(q),
        ).map(String)
      }

      // Suggest locations after prefix
      const prefixMatch = query.match(
        /^(INT\.?\/EXT\.?|INT\.?|EXT\.?|EST\.?|I\/E\.?)\s*/i,
      )
      if (prefixMatch) {
        const afterPrefix = query.slice(prefixMatch[0].length).toUpperCase()

        // Check if we're after a dash (time of day)
        const dashMatch = query.match(/-\s*(.*)$/i)
        if (dashMatch) {
          const timeQuery = dashMatch[1].trim().toUpperCase()
          return TIME_OF_DAY.filter((t) => t.startsWith(timeQuery)).map(
            String,
          )
        }

        // Suggest locations
        const locations = getLocations(doc)
        return locations.filter(
          (loc) => loc.startsWith(afterPrefix) && loc !== afterPrefix,
        )
      }

      return []
    }

    case "transition": {
      return TRANSITIONS.filter((t) =>
        t.toUpperCase().startsWith(q),
      ).map(String)
    }

    default:
      return []
  }
}
