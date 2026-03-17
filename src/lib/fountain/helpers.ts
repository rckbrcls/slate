const SLUGLINE_REGEX =
  /^(INT\.?\/EXT\.?|INT\.?|EXT\.?|EST\.?|I\/E\.?)\s+(.+?)(?:\s*-\s*(.+))?$/i

export function parseSlugline(text: string): {
  intExt: string | null
  location: string | null
  timeOfDay: string | null
} {
  const match = text.match(SLUGLINE_REGEX)
  if (!match) {
    return { intExt: null, location: text, timeOfDay: null }
  }
  return {
    intExt: match[1].toUpperCase().replace(/\.$/, ""),
    location: match[2].trim(),
    timeOfDay: match[3]?.trim() || null,
  }
}

const EXTENSION_REGEX = /^(.+?)\s*\(([^)]+)\)\s*$/

export function parseExtension(text: string): {
  name: string
  extension: string | null
} {
  const match = text.match(EXTENSION_REGEX)
  if (!match) {
    return { name: text.trim(), extension: null }
  }
  return { name: match[1].trim(), extension: match[2].trim() }
}

export function stripForceMarker(text: string): string {
  // Fountain force markers: . for scene heading, ! for action, @ for character, > for transition, ~ for lyrics
  return text.replace(/^[.!@>~]/, "")
}
