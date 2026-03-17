import type { Node as PmNode } from "@tiptap/pm/model"

// WGA standard page: 55 usable lines (Courier 12pt, 6 lines/inch, ~9.17" printable height)
const LINES_PER_PAGE = 55

// Character widths for word-wrap estimation (in monospace characters)
const LINE_WIDTH_ACTION = 61 // full width
const LINE_WIDTH_DIALOGUE = 35 // narrow dialogue column
const LINE_WIDTH_PARENTHETICAL = 25 // even narrower

// Spacing above each element type (in blank lines)
const SPACING: Record<string, number> = {
  sceneHeading: 2,
  action: 1,
  character: 1,
  dialogue: 0,
  parenthetical: 0,
  transition: 1,
  dualDialogue: 1,
  pageBreak: 0,
  section: 0,
  synopsis: 0,
  note: 0,
}

export interface PageBreakInfo {
  /** Position in the ProseMirror document (after this node) */
  afterPos: number
  /** Page number that ends at this break */
  pageNumber: number
  /** If dialogue was split: character name for CONT'D */
  contdCharacter?: string
  /** If dialogue was split: insert (MORE) before break */
  more?: boolean
}

export interface PaginationResult {
  pageBreaks: PageBreakInfo[]
  totalPages: number
}

/** Estimate number of lines a text occupies at a given line width */
function estimateLines(text: string, lineWidth: number): number {
  if (!text || text.length === 0) return 1
  const words = text.split(/\s+/)
  let lines = 1
  let currentLineLength = 0

  for (const word of words) {
    if (currentLineLength === 0) {
      currentLineLength = word.length
    } else if (currentLineLength + 1 + word.length > lineWidth) {
      lines++
      currentLineLength = word.length
    } else {
      currentLineLength += 1 + word.length
    }
  }

  return lines
}

/** Estimate lines consumed by a single node (including spacing above) */
function estimateNodeLines(
  node: PmNode,
  isFirst: boolean,
): number {
  const typeName = node.type.name
  const spacing = isFirst ? 0 : (SPACING[typeName] ?? 0)

  switch (typeName) {
    case "sceneHeading":
      return spacing + 1

    case "action":
      return spacing + estimateLines(node.textContent, LINE_WIDTH_ACTION)

    case "character":
      return spacing + 1

    case "dialogue":
      return spacing + estimateLines(node.textContent, LINE_WIDTH_DIALOGUE)

    case "parenthetical":
      return spacing + estimateLines(node.textContent, LINE_WIDTH_PARENTHETICAL)

    case "transition":
      return spacing + 1

    case "dualDialogue": {
      // Take the taller of the two columns
      let maxLines = 0
      node.forEach((column) => {
        let colLines = 0
        let colFirst = true
        column.forEach((child) => {
          colLines += estimateNodeLines(child, colFirst)
          colFirst = false
        })
        maxLines = Math.max(maxLines, colLines)
      })
      return spacing + maxLines
    }

    case "pageBreak":
      return 0 // explicit page breaks are handled separately

    // Non-printable elements
    case "section":
    case "synopsis":
    case "note":
      return 0

    default:
      return spacing + 1
  }
}

interface NodeEntry {
  node: PmNode
  pos: number
  lines: number
  type: string
}

/**
 * Core pagination algorithm.
 * Returns page break positions and total page count.
 */
export function paginate(doc: PmNode): PaginationResult {
  // First pass: collect all top-level nodes with their line estimates
  const entries: NodeEntry[] = []
  doc.forEach((node, offset) => {
    const nodePos = offset + 1 // ProseMirror positions are 1-based for children of doc
    entries.push({
      node,
      pos: nodePos,
      lines: estimateNodeLines(node, entries.length === 0),
      type: node.type.name,
    })
  })

  if (entries.length === 0) {
    return { pageBreaks: [], totalPages: 1 }
  }

  const pageBreaks: PageBreakInfo[] = []
  let currentPageLines = 0
  let pageNumber = 1

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    // Explicit page break
    if (entry.type === "pageBreak") {
      pageBreaks.push({
        afterPos: entry.pos + entry.node.nodeSize,
        pageNumber,
      })
      pageNumber++
      currentPageLines = 0
      continue
    }

    // Skip non-printable
    if (entry.lines === 0) continue

    const linesNeeded = entry.lines

    // Check if this element fits on the current page
    if (currentPageLines + linesNeeded > LINES_PER_PAGE && currentPageLines > 0) {
      // Need a page break before this element

      // === WIDOW PROTECTION ===
      // Scene heading should never be alone at the bottom of a page
      // If this is a scene heading, break BEFORE it (already what we're doing)

      // If previous element was a scene heading with no following content,
      // move the break before the scene heading
      if (i > 0 && entries[i - 1].type === "sceneHeading") {
        // Scene heading is a widow — move break before it
        const sceneEntry = entries[i - 1]
        pageBreaks.push({
          afterPos: sceneEntry.pos,
          pageNumber,
        })
        pageNumber++
        // Recalculate: scene heading + current element on new page
        currentPageLines = sceneEntry.lines + linesNeeded
        continue
      }

      // If this is a character cue, we need at least 1 line of dialogue after it
      if (entry.type === "character") {
        const nextEntry = entries[i + 1]
        const minLinesNeeded = 1 + (nextEntry ? Math.min(estimateNodeLines(nextEntry.node, false), 2) : 0)
        if (currentPageLines + minLinesNeeded > LINES_PER_PAGE) {
          // Can't fit character + min dialogue, break before character
          pageBreaks.push({
            afterPos: entry.pos,
            pageNumber,
          })
          pageNumber++
          currentPageLines = 0
        }
      }

      // === DIALOGUE SPLIT (MORE/CONT'D) ===
      if (entry.type === "dialogue" && currentPageLines > 0) {
        // Find the character name for this dialogue
        let characterName: string | undefined
        for (let j = i - 1; j >= 0; j--) {
          if (entries[j].type === "character") {
            characterName = entries[j].node.textContent.toUpperCase()
            break
          }
          if (entries[j].type === "sceneHeading" || entries[j].type === "transition") break
        }

        const linesAvailable = LINES_PER_PAGE - currentPageLines
        if (linesAvailable >= 2 && linesAvailable < linesNeeded) {
          // Split dialogue across pages
          pageBreaks.push({
            afterPos: entry.pos + entry.node.nodeSize,
            pageNumber,
            more: true,
            contdCharacter: characterName,
          })
          pageNumber++
          // Remaining lines on new page (approximate)
          currentPageLines = linesNeeded - linesAvailable + 2 // +2 for CONT'D line + spacing
          continue
        }

        // Can't split (< 2 lines available), break before dialogue
        pageBreaks.push({
          afterPos: entry.pos,
          pageNumber,
        })
        pageNumber++
        currentPageLines = linesNeeded
        continue
      }

      // Default: break before this element
      if (!pageBreaks.length || pageBreaks[pageBreaks.length - 1].pageNumber !== pageNumber) {
        // Find the break position — after the previous printable node
        let breakPos = entry.pos
        for (let j = i - 1; j >= 0; j--) {
          if (entries[j].lines > 0) {
            breakPos = entries[j].pos + entries[j].node.nodeSize
            break
          }
        }
        pageBreaks.push({
          afterPos: breakPos,
          pageNumber,
        })
        pageNumber++
        currentPageLines = linesNeeded
        continue
      }
    }

    currentPageLines += linesNeeded

    // === ORPHAN PROTECTION ===
    // If a character cue ends up at the very bottom with no room for dialogue
    if (entry.type === "character" && currentPageLines >= LINES_PER_PAGE - 1) {
      const nextEntry = entries[i + 1]
      if (nextEntry && (nextEntry.type === "dialogue" || nextEntry.type === "parenthetical")) {
        // Move character to next page
        currentPageLines -= linesNeeded
        pageBreaks.push({
          afterPos: entry.pos,
          pageNumber,
        })
        pageNumber++
        currentPageLines = linesNeeded
      }
    }
  }

  return {
    pageBreaks,
    totalPages: pageNumber,
  }
}
