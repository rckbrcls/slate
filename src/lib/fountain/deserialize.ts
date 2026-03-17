import { Fountain } from "fountain-js"
import type { JSONContent } from "@tiptap/core"
import type { TitlePage, FountainToken } from "./types"
import { parseSlugline, parseExtension } from "./helpers"

const fountain = new Fountain()

function parseInlineFormatting(text: string): Array<{ type: "text"; text: string; marks?: Array<{ type: string }> }> {
  const nodes: Array<{ type: "text"; text: string; marks?: Array<{ type: string }> }> = []
  const regex = /(\*{3}(.+?)\*{3}|\*{2}(.+?)\*{2}|\*(.+?)\*|_(.+?)_)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", text: text.slice(lastIndex, match.index) })
    }

    if (match[2]) {
      nodes.push({ type: "text", text: match[2], marks: [{ type: "bold" }, { type: "italic" }] })
    } else if (match[3]) {
      nodes.push({ type: "text", text: match[3], marks: [{ type: "bold" }] })
    } else if (match[4]) {
      nodes.push({ type: "text", text: match[4], marks: [{ type: "italic" }] })
    } else if (match[5]) {
      nodes.push({ type: "text", text: match[5], marks: [{ type: "underline" }] })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push({ type: "text", text: text.slice(lastIndex) })
  }

  return nodes
}

function stripInlineFormatting(text: string): string {
  return text
    .replace(/\*{3}(.+?)\*{3}/g, "$1") // bold italic
    .replace(/\*{2}(.+?)\*{2}/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/_(.+?)_/g, "$1") // underline
}

function textToContent(
  text: string,
  preserveFormatting: boolean,
): Array<{ type: "text"; text: string; marks?: Array<{ type: string }> }> | undefined {
  if (!text) return undefined
  if (preserveFormatting) {
    const nodes = parseInlineFormatting(text)
    return nodes.length > 0 ? nodes : undefined
  }
  return [{ type: "text", text }]
}

function parseSingleToken(token: FountainToken): JSONContent | null {
  const plainText = stripInlineFormatting(token.text || "")
  switch (token.type) {
    case "character": {
      const parsed = parseExtension(plainText)
      return {
        type: "character",
        attrs: { extension: parsed.extension, forced: false },
        content: parsed.name ? [{ type: "text", text: parsed.name }] : undefined,
      }
    }
    case "dialogue":
      return {
        type: "dialogue",
        content: textToContent(token.text || "", true),
      }
    case "parenthetical":
      return {
        type: "parenthetical",
        content: plainText ? [{ type: "text", text: plainText }] : undefined,
      }
    default:
      return null
  }
}

export function fountainToEditor(text: string): {
  content: JSONContent
  titlePage: TitlePage
} {
  const result = fountain.parse(text, true)
  const tokens = (result.tokens || []) as FountainToken[]
  const titlePage: TitlePage = {}
  const nodes: JSONContent[] = []

  // Extract title page
  for (const token of tokens) {
    if (token.is_title && token.type && token.text) {
      const key = token.type === "draft_date" ? "draftDate" : token.type
      titlePage[key] = token.text
    }
  }

  // Detect forced markers from the original text by scanning lines
  const sourceLines = text.split("\n")
  const forcedSceneHeadings = new Set<string>()
  const forcedCharacters = new Set<string>()
  const forcedTransitions = new Set<string>()
  for (const line of sourceLines) {
    const trimmed = line.trim()
    if (trimmed.startsWith(".") && !trimmed.startsWith("..")) {
      forcedSceneHeadings.add(stripInlineFormatting(trimmed.slice(1)).toUpperCase().trim())
    }
    if (trimmed.startsWith("@")) {
      forcedCharacters.add(stripInlineFormatting(trimmed.slice(1)).toUpperCase().trim())
    }
    if (trimmed.startsWith(">") && !trimmed.endsWith("<")) {
      forcedTransitions.add(stripInlineFormatting(trimmed.slice(1)).toUpperCase().trim())
    }
  }

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]

    if (token.is_title) {
      i++
      continue
    }

    switch (token.type) {
      case "scene_heading": {
        const plainText = stripInlineFormatting(token.text || "")
        const parsed = parseSlugline(plainText)
        const forced = forcedSceneHeadings.has(plainText.toUpperCase().trim())
        nodes.push({
          type: "sceneHeading",
          attrs: {
            intExt: parsed.intExt,
            location: parsed.location,
            timeOfDay: parsed.timeOfDay,
            sceneNumber: token.scene_number || null,
            forced,
          },
          content: textToContent(plainText, false),
        })
        break
      }

      case "action": {
        const rawText = token.text || ""
        const plainText = stripInlineFormatting(rawText)
        const centered = plainText.startsWith(">") && plainText.endsWith("<")
        const cleanText = centered
          ? plainText.slice(1, -1).trim()
          : plainText
        nodes.push({
          type: "action",
          attrs: { centered },
          content: centered
            ? textToContent(cleanText, false)
            : textToContent(rawText, true),
        })
        break
      }

      case "character": {
        const plainText = stripInlineFormatting(token.text || "")
        const parsed = parseExtension(plainText)
        const forced = forcedCharacters.has(plainText.toUpperCase().trim())
        nodes.push({
          type: "character",
          attrs: {
            extension: parsed.extension,
            forced,
          },
          content: parsed.name
            ? [{ type: "text", text: parsed.name }]
            : undefined,
        })
        break
      }

      case "dialogue": {
        const rawText = token.text || ""
        nodes.push({
          type: "dialogue",
          content: textToContent(rawText, true),
        })
        break
      }

      case "parenthetical": {
        const rawText = stripInlineFormatting(token.text || "")
        nodes.push({
          type: "parenthetical",
          content: rawText
            ? [{ type: "text", text: rawText }]
            : undefined,
        })
        break
      }

      case "transition": {
        const plainText = stripInlineFormatting(token.text || "")
        const forced = forcedTransitions.has(plainText.toUpperCase().trim())
        nodes.push({
          type: "transition",
          attrs: { forced },
          content: plainText
            ? [{ type: "text", text: plainText }]
            : undefined,
        })
        break
      }

      case "dual_dialogue_begin": {
        // Collect all tokens until dual_dialogue_end into two columns
        const columns: JSONContent[][] = [[], []]
        let colIndex = 0
        i++
        while (i < tokens.length && tokens[i].type !== "dual_dialogue_end") {
          const dt = tokens[i]
          // The second character cue with dual="right" starts column 2
          if (dt.type === "character" && dt.dual === "right") {
            colIndex = 1
          }
          if (dt.type === "dialogue_begin" || dt.type === "dialogue_end") {
            i++
            continue
          }
          const colNode = parseSingleToken(dt)
          if (colNode) columns[colIndex].push(colNode)
          i++
        }
        // i now points to dual_dialogue_end — the outer loop will i++

        if (columns[0].length > 0 || columns[1].length > 0) {
          nodes.push({
            type: "dualDialogue",
            content: [
              { type: "dualDialogueColumn", content: columns[0].length > 0 ? columns[0] : [{ type: "dialogue" }] },
              { type: "dualDialogueColumn", content: columns[1].length > 0 ? columns[1] : [{ type: "dialogue" }] },
            ],
          })
        }
        break
      }

      case "dual_dialogue_end":
      case "dialogue_begin":
      case "dialogue_end":
        break

      case "section": {
        const rawText = stripInlineFormatting(token.text || "")
        nodes.push({
          type: "section",
          attrs: { level: token.depth || 1 },
          content: rawText
            ? [{ type: "text", text: rawText }]
            : undefined,
        })
        break
      }

      case "synopsis": {
        const rawText = stripInlineFormatting(token.text || "")
        nodes.push({
          type: "synopsis",
          content: rawText
            ? [{ type: "text", text: rawText }]
            : undefined,
        })
        break
      }

      case "note": {
        const rawText = stripInlineFormatting(token.text || "")
        nodes.push({
          type: "note",
          content: rawText
            ? [{ type: "text", text: rawText }]
            : undefined,
        })
        break
      }

      case "centered": {
        const centeredText = stripInlineFormatting(token.text || "")
        nodes.push({
          type: "action",
          attrs: { centered: true },
          content: centeredText
            ? [{ type: "text", text: centeredText }]
            : undefined,
        })
        break
      }

      case "page_break": {
        nodes.push({ type: "pageBreak" })
        break
      }

      default:
        break
    }

    i++
  }

  // Ensure at least one node
  if (nodes.length === 0) {
    nodes.push({ type: "action" })
  }

  return {
    content: {
      type: "doc",
      content: nodes,
    },
    titlePage,
  }
}
