import type { Node as PmNode, Mark } from "@tiptap/pm/model"
import type { TitlePage } from "./types"

function serializeTitlePage(titlePage: TitlePage): string {
  const lines: string[] = []
  const fieldOrder = [
    "title",
    "credit",
    "author",
    "source",
    "draftDate",
    "contact",
    "copyright",
  ]
  const fieldNames: Record<string, string> = {
    title: "Title",
    credit: "Credit",
    author: "Author",
    source: "Source",
    draftDate: "Draft date",
    contact: "Contact",
    copyright: "Copyright",
  }

  for (const key of fieldOrder) {
    if (titlePage[key]) {
      lines.push(`${fieldNames[key] || key}: ${titlePage[key]}`)
    }
  }

  // Custom fields
  for (const [key, value] of Object.entries(titlePage)) {
    if (!fieldOrder.includes(key) && value) {
      lines.push(`${key}: ${value}`)
    }
  }

  if (lines.length === 0) return ""
  return lines.join("\n") + "\n\n"
}

function serializeInlineContent(node: PmNode): string {
  let result = ""
  node.forEach((child) => {
    if (!child.isText || !child.text) return
    let text = child.text
    const marks = child.marks as Mark[]
    const hasBold = marks.some((m) => m.type.name === "bold")
    const hasItalic = marks.some((m) => m.type.name === "italic")
    const hasUnderline = marks.some((m) => m.type.name === "underline")
    if (hasBold && hasItalic) {
      text = `***${text}***`
    } else if (hasBold) {
      text = `**${text}**`
    } else if (hasItalic) {
      text = `*${text}*`
    }
    if (hasUnderline) {
      text = `_${text}_`
    }
    result += text
  })
  return result
}

export function editorToFountain(
  doc: PmNode,
  titlePage?: TitlePage,
): string {
  const parts: string[] = []

  if (titlePage && Object.keys(titlePage).length > 0) {
    parts.push(serializeTitlePage(titlePage))
  }

  doc.descendants((node) => {
    const type = node.type.name
    const text = node.textContent

    switch (type) {
      case "sceneHeading": {
        parts.push("")
        const forced = node.attrs.forced
        parts.push(forced ? `.${text}` : text.toUpperCase())
        break
      }

      case "action": {
        parts.push("")
        const centered = node.attrs.centered
        if (centered) {
          parts.push(`> ${text} <`)
        } else {
          const inlineText = serializeInlineContent(node)
          parts.push(inlineText || text)
        }
        break
      }

      case "character": {
        parts.push("")
        const ext = node.attrs.extension
        const forced = node.attrs.forced
        let line = text.toUpperCase()
        if (ext) line += ` (${ext})`
        if (forced) line = `@${line}`
        parts.push(line)
        break
      }

      case "dialogue": {
        const inlineText = serializeInlineContent(node)
        parts.push(inlineText || text)
        break
      }

      case "parenthetical": {
        const pText = text.startsWith("(") ? text : `(${text})`
        const pFinal = pText.endsWith(")") ? pText : `${pText})`
        parts.push(pFinal)
        break
      }

      case "transition": {
        parts.push("")
        const forced = node.attrs.forced
        parts.push(forced ? `> ${text}` : text.toUpperCase())
        break
      }

      case "dualDialogue": {
        // Serialize dual dialogue: first column normal, second column character gets ^ suffix
        let colIdx = 0
        node.forEach((column) => {
          column.forEach((child) => {
            const childType = child.type.name
            const childText = child.textContent
            switch (childType) {
              case "character": {
                parts.push("")
                const ext = child.attrs.extension
                const forced = child.attrs.forced
                let line = childText.toUpperCase()
                if (ext) line += ` (${ext})`
                if (forced) line = `@${line}`
                if (colIdx === 1) line += " ^"
                parts.push(line)
                break
              }
              case "dialogue":
                parts.push(serializeInlineContent(child) || childText)
                break
              case "parenthetical": {
                const pText = childText.startsWith("(") ? childText : `(${childText})`
                const pFinal = pText.endsWith(")") ? pText : `${pText})`
                parts.push(pFinal)
                break
              }
            }
          })
          colIdx++
        })
        return false
      }

      case "dualDialogueColumn": {
        return false // handled by dualDialogue
      }

      case "pageBreak": {
        parts.push("")
        parts.push("===")
        break
      }

      case "section": {
        parts.push("")
        const level = node.attrs.level || 1
        parts.push(`${"#".repeat(level)} ${text}`)
        break
      }

      case "synopsis": {
        parts.push(`= ${text}`)
        break
      }

      case "note": {
        parts.push(`[[${text}]]`)
        break
      }

      default:
        // Skip text nodes and other inline content
        return false
    }

    return false // don't descend into children (we already got textContent)
  })

  // Clean up: remove leading empty lines, ensure single trailing newline
  return parts
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n"
}
