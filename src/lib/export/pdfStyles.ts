// WGA screenplay formatting constants in PDF points (72pt = 1 inch)

export const PAGE = {
  width: 612, // 8.5in (US Letter)
  height: 792, // 11in
  marginTop: 72, // 1in
  marginBottom: 72, // 1in
  marginLeft: 108, // 1.5in
  marginRight: 72, // 1in
} as const

// Usable text width: 612 - 108 - 72 = 432pt
export const TEXT_WIDTH = PAGE.width - PAGE.marginLeft - PAGE.marginRight

// Element indents relative to left margin (marginLeft is already 1.5in from page edge)
// All values are additional indent from the left margin
export const ELEMENT_STYLES = {
  sceneHeading: {
    marginLeft: 0,
    marginTop: 24, // 2 blank lines
    bold: true,
    uppercase: true,
  },
  action: {
    marginLeft: 0,
    marginTop: 12, // 1 blank line
  },
  character: {
    marginLeft: 158, // ~2.2in from text area left edge
    marginTop: 12,
    uppercase: true,
  },
  dialogue: {
    marginLeft: 72, // 1in from text area left edge
    width: 252, // ~3.5in
    marginTop: 0,
  },
  parenthetical: {
    marginLeft: 115, // ~1.6in from text area left edge
    width: 180, // ~2.5in
    marginTop: 0,
  },
  transition: {
    alignment: "right" as const,
    marginTop: 12,
    uppercase: true,
  },
} as const

export const FONT_SIZE = 12
export const LINE_HEIGHT = 1.0 // Courier 12pt single-spaced
