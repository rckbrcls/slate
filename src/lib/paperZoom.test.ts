import { describe, expect, it } from "vitest"
import {
  PAPER_ZOOM_DEFAULT,
  PAPER_ZOOM_MAX,
  PAPER_ZOOM_MIN,
  clampPaperZoom,
  formatPaperZoomPercent,
  getNextPaperZoomFromWheel,
  resetPaperZoom,
  shouldHandlePaperZoomWheel,
  stepPaperZoom,
} from "./paperZoom"

describe("paperZoom", () => {
  it("clamps zoom values to the supported range", () => {
    expect(clampPaperZoom(0.1)).toBe(PAPER_ZOOM_MIN)
    expect(clampPaperZoom(3)).toBe(PAPER_ZOOM_MAX)
    expect(clampPaperZoom(Number.NaN)).toBe(PAPER_ZOOM_DEFAULT)
  })

  it("steps toolbar zoom by ten percent and clamps at the edges", () => {
    expect(stepPaperZoom(1, 1)).toBe(1.1)
    expect(stepPaperZoom(1, -1)).toBe(0.9)
    expect(stepPaperZoom(1.95, 1)).toBe(PAPER_ZOOM_MAX)
    expect(stepPaperZoom(0.55, -1)).toBe(PAPER_ZOOM_MIN)
  })

  it("resets and formats the zoom percentage", () => {
    expect(resetPaperZoom()).toBe(PAPER_ZOOM_DEFAULT)
    expect(formatPaperZoomPercent(1)).toBe("100%")
    expect(formatPaperZoomPercent(1.105)).toBe("111%")
  })

  it("calculates wheel zoom direction without changing zero-delta events", () => {
    expect(getNextPaperZoomFromWheel(1, -100)).toBeGreaterThan(1)
    expect(getNextPaperZoomFromWheel(1, 100)).toBeLessThan(1)
    expect(getNextPaperZoomFromWheel(1.25, 0)).toBe(1.25)
  })

  it("handles only pinch-like or shifted wheel events", () => {
    expect(shouldHandlePaperZoomWheel({ ctrlKey: true })).toBe(true)
    expect(shouldHandlePaperZoomWheel({ shiftKey: true })).toBe(true)
    expect(shouldHandlePaperZoomWheel({})).toBe(false)
  })
})
