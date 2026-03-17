import type { Node as PmNode, Mark } from "@tiptap/pm/model"
import type { TitlePage } from "@/lib/fountain/types"

const FDX_TYPE_MAP: Record<string, string> = {
  sceneHeading: "Scene Heading",
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Parenthetical",
  transition: "Transition",
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function inlineToFdxText(node: PmNode): string {
  const parts: string[] = []
  node.forEach((child) => {
    if (!child.isText || !child.text) return
    const text = escapeXml(child.text)
    const marks = child.marks as Mark[]
    const styles: string[] = []
    if (marks.some((m) => m.type.name === "bold")) styles.push("Bold")
    if (marks.some((m) => m.type.name === "italic")) styles.push("Italic")
    if (marks.some((m) => m.type.name === "underline")) styles.push("Underline")

    if (styles.length > 0) {
      parts.push(`<Text Style="${styles.join("+")}">${text}</Text>`)
    } else {
      parts.push(`<Text>${text}</Text>`)
    }
  })
  // If node has no inline children, use textContent directly
  if (parts.length === 0 && node.textContent) {
    parts.push(`<Text>${escapeXml(node.textContent)}</Text>`)
  }
  return parts.join("")
}

function paragraphNode(
  type: string,
  textContent: string,
  attrs?: Record<string, string>,
): string {
  const attrStr = attrs
    ? Object.entries(attrs)
        .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
        .join("")
    : ""
  return `    <Paragraph Type="${type}"${attrStr}>\n      ${textContent}\n    </Paragraph>`
}

function serializeTitlePage(titlePage: TitlePage): string {
  const fieldMap: Record<string, string> = {
    title: "Title",
    credit: "Credit",
    author: "Author",
    source: "Source",
    draftDate: "Draft date",
    contact: "Contact",
    copyright: "Copyright",
  }

  const paragraphs: string[] = []
  for (const [key, label] of Object.entries(fieldMap)) {
    if (titlePage[key]) {
      paragraphs.push(
        `      <Paragraph Type="${label}">\n        <Text>${escapeXml(titlePage[key]!)}</Text>\n      </Paragraph>`,
      )
    }
  }

  if (paragraphs.length === 0) return ""
  return `  <TitlePage>\n    <Content>\n${paragraphs.join("\n")}\n    </Content>\n  </TitlePage>`
}

export function editorToFDX(doc: PmNode, titlePage?: TitlePage): string {
  const paragraphs: string[] = []
  let inDualDialogue = false

  doc.descendants((node) => {
    const type = node.type.name

    switch (type) {
      case "sceneHeading": {
        const fdxType = FDX_TYPE_MAP[type]
        const text = `<Text>${escapeXml(node.textContent.toUpperCase())}</Text>`
        const attrs: Record<string, string> = {}
        if (node.attrs.sceneNumber) {
          attrs.Number = node.attrs.sceneNumber
        }
        paragraphs.push(paragraphNode(fdxType, text, Object.keys(attrs).length ? attrs : undefined))
        return false
      }

      case "action": {
        const fdxType = node.attrs.centered ? "Action" : FDX_TYPE_MAP[type]
        const text = inlineToFdxText(node)
        const attrs: Record<string, string> = {}
        if (node.attrs.centered) attrs.Alignment = "Center"
        paragraphs.push(paragraphNode(fdxType, text, Object.keys(attrs).length ? attrs : undefined))
        return false
      }

      case "character": {
        const fdxType = FDX_TYPE_MAP[type]
        let charText = node.textContent.toUpperCase()
        if (node.attrs.extension) {
          charText += ` (${node.attrs.extension})`
        }
        const text = `<Text>${escapeXml(charText)}</Text>`
        const attrs: Record<string, string> = {}
        if (inDualDialogue) {
          // DualDialogue attrs are set on the character paragraphs
        }
        paragraphs.push(paragraphNode(fdxType, text, Object.keys(attrs).length ? attrs : undefined))
        return false
      }

      case "dialogue":
      case "parenthetical": {
        const fdxType = FDX_TYPE_MAP[type]
        const text = type === "dialogue" ? inlineToFdxText(node) : `<Text>${escapeXml(node.textContent)}</Text>`
        paragraphs.push(paragraphNode(fdxType, text))
        return false
      }

      case "transition": {
        const fdxType = FDX_TYPE_MAP[type]
        const text = `<Text>${escapeXml(node.textContent.toUpperCase())}</Text>`
        paragraphs.push(paragraphNode(fdxType, text))
        return false
      }

      case "dualDialogue": {
        inDualDialogue = true
        const columns: PmNode[] = []
        node.forEach((column) => columns.push(column))
        columns.forEach((column, colIdx) => {
          column.forEach((child) => {
            const childType = child.type.name
            const fdxType = FDX_TYPE_MAP[childType]
            if (!fdxType) return

            if (childType === "character") {
              let charText = child.textContent.toUpperCase()
              if (child.attrs.extension) charText += ` (${child.attrs.extension})`
              const text = `<Text>${escapeXml(charText)}</Text>`
              const attrs: Record<string, string> = {}
              if (colIdx === 0) attrs.DualDialogue = "Start"
              if (colIdx === 1) attrs.DualDialogue = "End"
              paragraphs.push(paragraphNode(fdxType, text, attrs))
            } else if (childType === "dialogue") {
              paragraphs.push(paragraphNode(fdxType, inlineToFdxText(child)))
            } else if (childType === "parenthetical") {
              paragraphs.push(paragraphNode(fdxType, `<Text>${escapeXml(child.textContent)}</Text>`))
            }
          })
        })
        inDualDialogue = false
        return false
      }

      case "dualDialogueColumn":
        return false

      default:
        return false
    }
  })

  const titlePageXml = titlePage ? serializeTitlePage(titlePage) : ""
  const bodyXml = paragraphs.join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
${titlePageXml ? titlePageXml + "\n" : ""}  <Content>
${bodyXml}
  </Content>
</FinalDraft>
`
}
