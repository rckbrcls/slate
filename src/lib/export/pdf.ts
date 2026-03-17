import type { Node as PmNode, Mark } from "@tiptap/pm/model"
import type { TDocumentDefinitions, Content, ContentText } from "pdfmake/interfaces"
import type { TitlePage } from "@/lib/fountain/types"
import { PAGE, TEXT_WIDTH, ELEMENT_STYLES, FONT_SIZE, LINE_HEIGHT } from "./pdfStyles"
import { courierPrimeVfs, courierPrimeFonts } from "./pdfFonts"

interface TextRun {
  text: string
  bold?: boolean
  italics?: boolean
  decoration?: string
}

function inlineToTextRuns(node: PmNode): TextRun[] {
  const runs: TextRun[] = []
  node.forEach((child) => {
    if (!child.isText || !child.text) return
    const marks = child.marks as Mark[]
    const run: TextRun = { text: child.text }
    if (marks.some((m) => m.type.name === "bold")) run.bold = true
    if (marks.some((m) => m.type.name === "italic")) run.italics = true
    if (marks.some((m) => m.type.name === "underline")) run.decoration = "underline"
    runs.push(run)
  })
  if (runs.length === 0 && node.textContent) {
    runs.push({ text: node.textContent })
  }
  return runs
}

function buildTitlePage(titlePage: TitlePage): Content[] {
  const items: Content[] = []

  // Title centered, upper third
  if (titlePage.title) {
    items.push({
      text: titlePage.title,
      fontSize: FONT_SIZE,
      bold: true,
      alignment: "center",
      margin: [0, 200, 0, 12],
    })
  }

  if (titlePage.credit) {
    items.push({
      text: titlePage.credit,
      fontSize: FONT_SIZE,
      alignment: "center",
      margin: [0, 0, 0, 12],
    })
  }

  if (titlePage.author) {
    items.push({
      text: titlePage.author,
      fontSize: FONT_SIZE,
      alignment: "center",
      margin: [0, 0, 0, 0],
    })
  }

  // Contact info at bottom-left
  const contactLines: string[] = []
  if (titlePage.source) contactLines.push(titlePage.source)
  if (titlePage.draftDate) contactLines.push(titlePage.draftDate)
  if (titlePage.contact) contactLines.push(titlePage.contact)
  if (titlePage.copyright) contactLines.push(titlePage.copyright)

  if (contactLines.length > 0) {
    items.push({
      text: contactLines.join("\n"),
      fontSize: FONT_SIZE,
      alignment: "left",
      margin: [0, 200, 0, 0],
    })
  }

  // Page break after title page
  items.push({ text: "", pageBreak: "after" })

  return items
}

export function editorToPdfDefinition(
  doc: PmNode,
  titlePage?: TitlePage,
): TDocumentDefinitions {
  const content: Content[] = []
  const hasTitlePage = titlePage && Object.keys(titlePage).length > 0

  if (hasTitlePage) {
    content.push(...buildTitlePage(titlePage))
  }

  let isFirstElement = true

  doc.descendants((node) => {
    const type = node.type.name
    switch (type) {
      case "sceneHeading": {
        const s = ELEMENT_STYLES.sceneHeading
        const marginTop = isFirstElement ? 0 : s.marginTop
        content.push({
          text: node.textContent.toUpperCase(),
          bold: true,
          fontSize: FONT_SIZE,
          margin: [s.marginLeft, marginTop, 0, 0],
        })
        isFirstElement = false
        return false
      }

      case "action": {
        const s = ELEMENT_STYLES.action
        const marginTop = isFirstElement ? 0 : s.marginTop
        const runs = inlineToTextRuns(node)
        if (node.attrs.centered) {
          content.push({
            text: runs as ContentText[],
            fontSize: FONT_SIZE,
            alignment: "center",
            margin: [s.marginLeft, marginTop, 0, 0],
          })
        } else {
          content.push({
            text: runs as ContentText[],
            fontSize: FONT_SIZE,
            margin: [s.marginLeft, marginTop, 0, 0],
          })
        }
        isFirstElement = false
        return false
      }

      case "character": {
        const s = ELEMENT_STYLES.character
        const marginTop = isFirstElement ? 0 : s.marginTop
        let charText = node.textContent.toUpperCase()
        if (node.attrs.extension) charText += ` (${node.attrs.extension})`
        content.push({
          text: charText,
          fontSize: FONT_SIZE,
          margin: [s.marginLeft, marginTop, 0, 0],
        })
        isFirstElement = false
        return false
      }

      case "dialogue": {
        const s = ELEMENT_STYLES.dialogue
        // Right margin = textWidth - leftIndent - dialogueWidth to constrain width
        const dialogueRight = TEXT_WIDTH - s.marginLeft - s.width
        const runs = inlineToTextRuns(node)
        content.push({
          text: runs as ContentText[],
          fontSize: FONT_SIZE,
          margin: [s.marginLeft, s.marginTop, Math.max(dialogueRight, 0), 0],
        })
        isFirstElement = false
        return false
      }

      case "parenthetical": {
        const s = ELEMENT_STYLES.parenthetical
        const parenRight = TEXT_WIDTH - s.marginLeft - s.width
        content.push({
          text: node.textContent,
          fontSize: FONT_SIZE,
          margin: [s.marginLeft, s.marginTop, Math.max(parenRight, 0), 0],
        })
        isFirstElement = false
        return false
      }

      case "transition": {
        const s = ELEMENT_STYLES.transition
        const marginTop = isFirstElement ? 0 : s.marginTop
        content.push({
          text: node.textContent.toUpperCase(),
          fontSize: FONT_SIZE,
          alignment: "right",
          margin: [0, marginTop, 0, 0],
        })
        isFirstElement = false
        return false
      }

      case "dualDialogue": {
        // Render as two-column table
        const columns: Content[][] = [[], []]
        node.forEach((column, _offset, index) => {
          column.forEach((child) => {
            const childType = child.type.name
            if (childType === "character") {
              let charText = child.textContent.toUpperCase()
              if (child.attrs.extension) charText += ` (${child.attrs.extension})`
              columns[index].push({
                text: charText,
                fontSize: FONT_SIZE,
                margin: [40, 0, 0, 0],
              })
            } else if (childType === "dialogue") {
              columns[index].push({
                text: inlineToTextRuns(child) as ContentText[],
                fontSize: FONT_SIZE,
                margin: [10, 0, 0, 0],
              })
            } else if (childType === "parenthetical") {
              columns[index].push({
                text: child.textContent,
                fontSize: FONT_SIZE,
                margin: [25, 0, 0, 0],
              })
            }
          })
        })

        const marginTop = isFirstElement ? 0 : 12
        content.push({
          columns: [
            { stack: columns[0], width: "50%" },
            { stack: columns[1], width: "50%" },
          ],
          margin: [0, marginTop, 0, 0],
        } as Content)
        isFirstElement = false
        return false
      }

      case "dualDialogueColumn":
        return false

      case "pageBreak":
        content.push({ text: "", pageBreak: "after" })
        return false

      // Non-printable elements
      case "section":
      case "synopsis":
      case "note":
        return false

      default:
        return false
    }
  })

  return {
    pageSize: { width: PAGE.width, height: PAGE.height },
    pageMargins: [PAGE.marginLeft, PAGE.marginTop, PAGE.marginRight, PAGE.marginBottom],
    defaultStyle: {
      font: "CourierPrime",
      fontSize: FONT_SIZE,
      lineHeight: LINE_HEIGHT,
    },
    header(currentPage: number) {
      // Page numbers top-right, starting from page 2 (or page 2 after title page)
      const displayPage = hasTitlePage ? currentPage - 1 : currentPage
      if (displayPage <= 1) return null
      return {
        text: `${displayPage}.`,
        fontSize: FONT_SIZE,
        alignment: "right",
        margin: [0, 36, PAGE.marginRight, 0],
      }
    },
    content,
  }
}

export async function generatePDF(
  doc: PmNode,
  titlePage?: TitlePage,
): Promise<Uint8Array> {
  const pdfmake = await import("pdfmake/build/pdfmake")
  const pdfMakeInstance = (pdfmake.default || pdfmake) as typeof import("pdfmake/build/pdfmake")

  // Register fonts and VFS before creating PDF
  pdfMakeInstance.addVirtualFileSystem(courierPrimeVfs)
  pdfMakeInstance.addFonts(courierPrimeFonts)

  const docDefinition = editorToPdfDefinition(doc, titlePage)

  const printer = pdfMakeInstance.createPdf(docDefinition)
  const buffer = await printer.getBuffer()
  return new Uint8Array(buffer)
}
