export const PAPER_ZOOM_DEFAULT = 1
export const PAPER_ZOOM_MIN = 0.5
export const PAPER_ZOOM_MAX = 2
export const PAPER_ZOOM_STEP = 0.1
export const PAPER_ZOOM_STORAGE_KEY = "slate.editor.paperZoom.v1"

const PAPER_ZOOM_WHEEL_SENSITIVITY = 0.001

function roundPaperZoom(value: number) {
  return Math.round(value * 1000) / 1000
}

export function clampPaperZoom(value: number) {
  if (!Number.isFinite(value)) return PAPER_ZOOM_DEFAULT

  return roundPaperZoom(Math.min(PAPER_ZOOM_MAX, Math.max(PAPER_ZOOM_MIN, value)))
}

export function stepPaperZoom(currentZoom: number, direction: -1 | 1) {
  return clampPaperZoom(currentZoom + PAPER_ZOOM_STEP * direction)
}

export function resetPaperZoom() {
  return PAPER_ZOOM_DEFAULT
}

export function getNextPaperZoomFromWheel(currentZoom: number, deltaY: number) {
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return clampPaperZoom(currentZoom)
  }

  return clampPaperZoom(currentZoom * Math.exp(-deltaY * PAPER_ZOOM_WHEEL_SENSITIVITY))
}

export function shouldHandlePaperZoomWheel(event: {
  ctrlKey?: boolean
  shiftKey?: boolean
}) {
  return Boolean(event.ctrlKey || event.shiftKey)
}

export function formatPaperZoomPercent(zoom: number) {
  return `${Math.round(clampPaperZoom(zoom) * 100)}%`
}
