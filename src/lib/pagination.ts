import type { Node as PmNode } from "@tiptap/pm/model"
import { PAGINATION_LAYOUT } from "./paginationLayout"

const LINES_PER_PAGE = PAGINATION_LAYOUT.linesPerPage
const LINE_WIDTH_ACTION = PAGINATION_LAYOUT.lineWidthAction
const LINE_WIDTH_DIALOGUE = PAGINATION_LAYOUT.lineWidthDialogue
const LINE_WIDTH_PARENTHETICAL = PAGINATION_LAYOUT.lineWidthParenthetical

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

function pushPageBreak(pageBreaks: PageBreakInfo[], nextBreak: PageBreakInfo) {
  const lastBreak = pageBreaks.at(-1)

  if (!lastBreak) {
    pageBreaks.push(nextBreak)
    return true
  }

  if (
    lastBreak.afterPos === nextBreak.afterPos ||
    lastBreak.pageNumber === nextBreak.pageNumber
  ) {
    pageBreaks[pageBreaks.length - 1] = {
      ...lastBreak,
      ...nextBreak,
      pageNumber: lastBreak.pageNumber,
      more: lastBreak.more || nextBreak.more,
      contdCharacter: nextBreak.contdCharacter ?? lastBreak.contdCharacter,
    }
    return false
  }

  if (
    nextBreak.afterPos < lastBreak.afterPos ||
    nextBreak.pageNumber < lastBreak.pageNumber
  ) {
    return false
  }

  pageBreaks.push(nextBreak)
  return true
}

/** Estimate number of lines a text occupies at a given line width */
function estimateLines(text: string, lineWidth: number): number {
  if (!text || text.length === 0) return 1

  const segments = text.split("\n")
  let totalLines = 0

  for (const segment of segments) {
    if (segment.length === 0) {
      totalLines++
      continue
    }

    const words = segment.split(/\s+/).filter(Boolean)
    let lines = 1
    let currentLineLength = 0

    for (const word of words) {
      let remaining = word.length

      while (remaining > 0) {
        const spacer = currentLineLength === 0 ? 0 : 1
        const available = lineWidth - currentLineLength - spacer

        if (available <= 0) {
          lines++
          currentLineLength = 0
          continue
        }

        if (remaining <= available) {
          currentLineLength += spacer + remaining
          remaining = 0
          continue
        }

        currentLineLength += spacer + available
        remaining -= available

        if (remaining > 0) {
          lines++
          currentLineLength = 0
        }
      }
    }

    totalLines += lines
  }

  return totalLines
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

// ── Measured entry used by paginateMeasured ──

interface MeasuredEntry {
  node: PmNode
  pos: number
  endPos: number
  type: string
  heightPx: number
}

/**
 * Sync pagination using character-count estimation.
 * Used as fallback for state.init() (no view yet) and for tests without DOM.
 */
export function paginate(doc: PmNode): PaginationResult {
  // First pass: collect all top-level nodes with their line estimates
  const entries: NodeEntry[] = []
  doc.forEach((node, offset) => {
    const nodePos = offset
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
      const inserted = pushPageBreak(pageBreaks, {
        afterPos: entry.pos + entry.node.nodeSize,
        pageNumber,
      })
      if (inserted) {
        pageNumber++
      }
      currentPageLines = 0
      continue
    }

    // Skip non-printable
    if (entry.lines === 0) continue

    const linesNeeded = entry.lines

    // Check if this element fits on the current page
    if (currentPageLines + linesNeeded > LINES_PER_PAGE && currentPageLines > 0) {
      // === WIDOW PROTECTION ===
      if (i > 0 && entries[i - 1].type === "sceneHeading") {
        const sceneEntry = entries[i - 1]
        const inserted = pushPageBreak(pageBreaks, {
          afterPos: sceneEntry.pos,
          pageNumber,
        })
        if (inserted) {
          pageNumber++
          currentPageLines = sceneEntry.lines + linesNeeded
          continue
        }
      }

      // Character orphan protection
      if (entry.type === "character") {
        const nextEntry = entries[i + 1]
        const minLinesNeeded = 1 + (nextEntry ? Math.min(estimateNodeLines(nextEntry.node, false), 2) : 0)
        if (currentPageLines + minLinesNeeded > LINES_PER_PAGE) {
          const inserted = pushPageBreak(pageBreaks, {
            afterPos: entry.pos,
            pageNumber,
          })
          if (inserted) {
            pageNumber++
            currentPageLines = linesNeeded
            continue
          }
        }
      }

      // === DIALOGUE SPLIT (MORE/CONT'D) ===
      if (entry.type === "dialogue" && currentPageLines > 0) {
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
          const inserted = pushPageBreak(pageBreaks, {
            afterPos: entry.pos + entry.node.nodeSize,
            pageNumber,
            more: true,
            contdCharacter: characterName,
          })
          if (inserted) {
            pageNumber++
            currentPageLines = linesNeeded - linesAvailable + 2
            continue
          }
        }

        const inserted = pushPageBreak(pageBreaks, {
          afterPos: entry.pos,
          pageNumber,
        })
        if (inserted) {
          pageNumber++
          currentPageLines = linesNeeded
          continue
        }
      }

      // Default: break before this element
      if (!pageBreaks.length || pageBreaks[pageBreaks.length - 1].pageNumber !== pageNumber) {
        let breakPos = entry.pos
        for (let j = i - 1; j >= 0; j--) {
          if (entries[j].lines > 0) {
            breakPos = entries[j].pos + entries[j].node.nodeSize
            break
          }
        }
        const inserted = pushPageBreak(pageBreaks, {
          afterPos: breakPos,
          pageNumber,
        })
        if (inserted) {
          pageNumber++
          currentPageLines = linesNeeded
          continue
        }
      }
    }

    currentPageLines += linesNeeded

    // === ORPHAN PROTECTION ===
    if (entry.type === "character" && currentPageLines >= LINES_PER_PAGE - 1) {
      const nextEntry = entries[i + 1]
      if (nextEntry && (nextEntry.type === "dialogue" || nextEntry.type === "parenthetical")) {
        currentPageLines -= linesNeeded
        const inserted = pushPageBreak(pageBreaks, {
          afterPos: entry.pos,
          pageNumber,
        })
        if (inserted) {
          pageNumber++
          currentPageLines = linesNeeded
        }
      }
    }
  }

  return {
    pageBreaks,
    totalPages: pageNumber,
  }
}

// ── Pixel-measured pagination ──

const SUBPIXEL_EPSILON = 0.5
const MIN_DIALOGUE_SPLIT_PX = 40 // 2 lines at 20px

/**
 * Pagination using real pixel measurements from a hidden measurement div.
 * `measure` should be MeasurementService.measureNode bound to the service.
 */
export function paginateMeasured(
  doc: PmNode,
  measure: (node: PmNode) => number,
  contentHeightPx: number,
): PaginationResult {
  // Step 1: Collect measured entries
  const entries: MeasuredEntry[] = []
  doc.forEach((node, offset) => {
    entries.push({
      node,
      pos: offset,
      endPos: offset + node.nodeSize,
      type: node.type.name,
      heightPx: node.type.name === "pageBreak" ? 0 : measure(node),
    })
  })

  if (entries.length === 0) {
    return { pageBreaks: [], totalPages: 1 }
  }

  // Step 2: Accumulate heights and break pages
  const pageBreaks: PageBreakInfo[] = []
  let currentHeight = 0
  let pageNumber = 1

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    // Explicit page break
    if (entry.type === "pageBreak") {
      const inserted = pushPageBreak(pageBreaks, {
        afterPos: entry.endPos,
        pageNumber,
      })
      if (inserted) pageNumber++
      currentHeight = 0
      continue
    }

    // Skip non-printable / zero-height
    if (entry.heightPx === 0) continue

    const fits = currentHeight + entry.heightPx <= contentHeightPx + SUBPIXEL_EPSILON

    if (!fits && currentHeight > 0) {
      // Step 3: Post-processing rules

      // Scene heading widow: if previous was a sceneHeading alone, move break before it
      if (i > 0 && entries[i - 1].type === "sceneHeading") {
        const sceneEntry = entries[i - 1]
        const inserted = pushPageBreak(pageBreaks, {
          afterPos: sceneEntry.pos,
          pageNumber,
        })
        if (inserted) {
          pageNumber++
          currentHeight = sceneEntry.heightPx + entry.heightPx
          continue
        }
      }

      // Character orphan: character without dialogue on the page
      if (entry.type === "character") {
        const inserted = pushPageBreak(pageBreaks, {
          afterPos: entry.pos,
          pageNumber,
        })
        if (inserted) pageNumber++
        currentHeight = entry.heightPx
        continue
      }

      // Dialogue split with MORE/CONT'D
      if (entry.type === "dialogue" && currentHeight > 0) {
        let characterName: string | undefined
        for (let j = i - 1; j >= 0; j--) {
          if (entries[j].type === "character") {
            characterName = entries[j].node.textContent.toUpperCase()
            break
          }
          if (entries[j].type === "sceneHeading" || entries[j].type === "transition") break
        }

        const spaceAvailable = contentHeightPx - currentHeight
        const spaceOnNextPage = entry.heightPx - spaceAvailable

        if (spaceAvailable >= MIN_DIALOGUE_SPLIT_PX && spaceOnNextPage >= MIN_DIALOGUE_SPLIT_PX) {
          // Split: mark MORE/CONT'D
          const inserted = pushPageBreak(pageBreaks, {
            afterPos: entry.endPos,
            pageNumber,
            more: true,
            contdCharacter: characterName,
          })
          if (inserted) pageNumber++
          currentHeight = spaceOnNextPage
          continue
        }

        // Can't split — break before dialogue
        const inserted = pushPageBreak(pageBreaks, {
          afterPos: entry.pos,
          pageNumber,
        })
        if (inserted) pageNumber++
        currentHeight = entry.heightPx
        continue
      }

      // Default: break before this element
      let breakPos = entry.pos
      for (let j = i - 1; j >= 0; j--) {
        if (entries[j].heightPx > 0) {
          breakPos = entries[j].endPos
          break
        }
      }
      const inserted = pushPageBreak(pageBreaks, {
        afterPos: breakPos,
        pageNumber,
      })
      if (inserted) pageNumber++
      currentHeight = entry.heightPx
      continue
    }

    currentHeight += entry.heightPx

    // Orphan protection: character near bottom with dialogue next
    if (entry.type === "character") {
      const nextEntry = entries[i + 1]
      if (nextEntry && (nextEntry.type === "dialogue" || nextEntry.type === "parenthetical")) {
        const nextHeight = nextEntry.heightPx || measure(nextEntry.node)
        const minNeeded = Math.min(nextHeight, MIN_DIALOGUE_SPLIT_PX)
        if (currentHeight + minNeeded > contentHeightPx + SUBPIXEL_EPSILON) {
          currentHeight -= entry.heightPx
          const inserted = pushPageBreak(pageBreaks, {
            afterPos: entry.pos,
            pageNumber,
          })
          if (inserted) pageNumber++
          currentHeight = entry.heightPx
        }
      }
    }
  }

  return {
    pageBreaks,
    totalPages: pageNumber,
  }
}

/**
 * Incremental re-pagination: reuses page breaks before the change position,
 * only recalculates from the affected page onward.
 */
export function paginateIncremental(
  doc: PmNode,
  measure: (node: PmNode) => number,
  contentHeightPx: number,
  prevResult: PaginationResult,
  changePos: number,
): PaginationResult {
  // Find which page the change falls in
  let affectedPageIdx = 0
  for (let i = 0; i < prevResult.pageBreaks.length; i++) {
    if (prevResult.pageBreaks[i].afterPos > changePos) break
    affectedPageIdx = i + 1
  }

  // Preserve breaks before the affected page
  const preservedBreaks = prevResult.pageBreaks.slice(0, affectedPageIdx)

  // Determine the starting position and page number for re-pagination
  const startPos = affectedPageIdx > 0
    ? prevResult.pageBreaks[affectedPageIdx - 1].afterPos
    : 0
  const startPage = affectedPageIdx > 0
    ? prevResult.pageBreaks[affectedPageIdx - 1].pageNumber + 1
    : 1

  // Collect entries from the start position onward
  const entries: MeasuredEntry[] = []
  doc.forEach((node, offset) => {
    if (offset + node.nodeSize <= startPos) return
    entries.push({
      node,
      pos: offset,
      endPos: offset + node.nodeSize,
      type: node.type.name,
      heightPx: node.type.name === "pageBreak" ? 0 : measure(node),
    })
  })

  if (entries.length === 0) {
    return {
      pageBreaks: preservedBreaks,
      totalPages: Math.max(startPage, 1),
    }
  }

  // Run the measured algorithm on remaining entries
  const newBreaks: PageBreakInfo[] = []
  let currentHeight = 0
  let pageNumber = startPage

  // If we're resuming mid-page, account for content before startPos on this page
  // by measuring nodes on this page that are before the first entry
  if (entries.length > 0 && entries[0].pos > startPos) {
    doc.forEach((node, offset) => {
      if (offset >= entries[0].pos) return
      if (offset < startPos) return
      if (node.type.name === "pageBreak") return
      currentHeight += measure(node)
    })
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    if (entry.type === "pageBreak") {
      const inserted = pushPageBreak(newBreaks, {
        afterPos: entry.endPos,
        pageNumber,
      })
      if (inserted) pageNumber++
      currentHeight = 0
      continue
    }

    if (entry.heightPx === 0) continue

    const fits = currentHeight + entry.heightPx <= contentHeightPx + SUBPIXEL_EPSILON

    if (!fits && currentHeight > 0) {
      // Scene heading widow
      if (i > 0 && entries[i - 1].type === "sceneHeading") {
        const sceneEntry = entries[i - 1]
        const inserted = pushPageBreak(newBreaks, {
          afterPos: sceneEntry.pos,
          pageNumber,
        })
        if (inserted) {
          pageNumber++
          currentHeight = sceneEntry.heightPx + entry.heightPx
          continue
        }
      }

      // Character orphan
      if (entry.type === "character") {
        const inserted = pushPageBreak(newBreaks, {
          afterPos: entry.pos,
          pageNumber,
        })
        if (inserted) pageNumber++
        currentHeight = entry.heightPx
        continue
      }

      // Dialogue split
      if (entry.type === "dialogue" && currentHeight > 0) {
        let characterName: string | undefined
        for (let j = i - 1; j >= 0; j--) {
          if (entries[j].type === "character") {
            characterName = entries[j].node.textContent.toUpperCase()
            break
          }
          if (entries[j].type === "sceneHeading" || entries[j].type === "transition") break
        }

        const spaceAvailable = contentHeightPx - currentHeight
        const spaceOnNextPage = entry.heightPx - spaceAvailable

        if (spaceAvailable >= MIN_DIALOGUE_SPLIT_PX && spaceOnNextPage >= MIN_DIALOGUE_SPLIT_PX) {
          const inserted = pushPageBreak(newBreaks, {
            afterPos: entry.endPos,
            pageNumber,
            more: true,
            contdCharacter: characterName,
          })
          if (inserted) pageNumber++
          currentHeight = spaceOnNextPage
          continue
        }

        const inserted = pushPageBreak(newBreaks, {
          afterPos: entry.pos,
          pageNumber,
        })
        if (inserted) pageNumber++
        currentHeight = entry.heightPx
        continue
      }

      // Default break
      let breakPos = entry.pos
      for (let j = i - 1; j >= 0; j--) {
        if (entries[j].heightPx > 0) {
          breakPos = entries[j].endPos
          break
        }
      }
      const inserted = pushPageBreak(newBreaks, {
        afterPos: breakPos,
        pageNumber,
      })
      if (inserted) pageNumber++
      currentHeight = entry.heightPx
      continue
    }

    currentHeight += entry.heightPx

    // Orphan protection
    if (entry.type === "character") {
      const nextEntry = entries[i + 1]
      if (nextEntry && (nextEntry.type === "dialogue" || nextEntry.type === "parenthetical")) {
        const nextHeight = nextEntry.heightPx || measure(nextEntry.node)
        const minNeeded = Math.min(nextHeight, MIN_DIALOGUE_SPLIT_PX)
        if (currentHeight + minNeeded > contentHeightPx + SUBPIXEL_EPSILON) {
          currentHeight -= entry.heightPx
          const inserted = pushPageBreak(newBreaks, {
            afterPos: entry.pos,
            pageNumber,
          })
          if (inserted) pageNumber++
          currentHeight = entry.heightPx
        }
      }
    }
  }

  return {
    pageBreaks: [...preservedBreaks, ...newBreaks],
    totalPages: pageNumber,
  }
}
