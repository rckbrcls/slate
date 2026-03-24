export const PAGINATION_LAYOUT = {
  // Inches — used for CSS vars
  pageWidthIn: 8.5,
  pageHeightIn: 11,
  marginTopIn: 1,
  marginRightIn: 1,
  marginBottomIn: 1,
  marginLeftIn: 1.5,
  pageGapRem: 1.25,

  // CSS pixels (96 DPI) — used by measurement algorithm
  pageWidthPx: 816, // 8.5 * 96
  pageHeightPx: 1056, // 11 * 96
  marginTopPx: 96, // 1in
  marginBottomPx: 96, // 1in
  marginLeftPx: 144, // 1.5in
  marginRightPx: 96, // 1in
  contentHeightPx: 864, // 1056 - 96 - 96
  textWidthPx: 576, // 816 - 144 - 96
  lineHeightPx: 20,

  // Character-estimate fallbacks (for sync paginate() without DOM)
  linesPerPage: 50,
  lineWidthAction: 58,
  lineWidthDialogue: 36,
  lineWidthParenthetical: 24,
} as const

export function getPaginationCssVars(totalPages: number): Record<string, string> {
  const pageCount = Math.max(totalPages, 1)
  const contentHeightIn = PAGINATION_LAYOUT.pageHeightIn - PAGINATION_LAYOUT.marginTopIn - PAGINATION_LAYOUT.marginBottomIn
  const textWidthIn = PAGINATION_LAYOUT.pageWidthIn - PAGINATION_LAYOUT.marginLeftIn - PAGINATION_LAYOUT.marginRightIn

  return {
    "--page-width": `${PAGINATION_LAYOUT.pageWidthIn}in`,
    "--page-height": `${PAGINATION_LAYOUT.pageHeightIn}in`,
    "--page-margin-top": `${PAGINATION_LAYOUT.marginTopIn}in`,
    "--page-margin-right": `${PAGINATION_LAYOUT.marginRightIn}in`,
    "--page-margin-bottom": `${PAGINATION_LAYOUT.marginBottomIn}in`,
    "--page-margin-left": `${PAGINATION_LAYOUT.marginLeftIn}in`,
    "--page-gap": `${PAGINATION_LAYOUT.pageGapRem}rem`,
    "--page-content-height": `${contentHeightIn}in`,
    "--page-text-width": `${textWidthIn}in`,
    "--page-stack-height": `calc(${pageCount} * ${PAGINATION_LAYOUT.pageHeightIn}in + ${Math.max(pageCount - 1, 0)} * ${PAGINATION_LAYOUT.pageGapRem}rem)`,
    "--page-break-gap": "calc(var(--page-margin-top) + var(--page-margin-bottom) + var(--page-gap))",
  }
}
