import type { CSSProperties, ReactNode } from "react"
import { clampPaperZoom } from "@/lib/paperZoom"
import { PAGINATION_LAYOUT, getPaginationCssVars } from "@/lib/paginationLayout"

interface ScreenplayPageStackProps {
  totalPages: number
  hidden?: boolean
  zoom?: number
  children: ReactNode
}

export function ScreenplayPageStack({
  totalPages,
  hidden = false,
  zoom = 1,
  children,
}: ScreenplayPageStackProps) {
  const pageCount = Math.max(totalPages, 1)
  const pageGapCount = Math.max(pageCount - 1, 0)
  const paperZoom = clampPaperZoom(zoom)
  const scaledPageWidthIn = PAGINATION_LAYOUT.pageWidthIn * paperZoom
  const scaledPageHeightIn = PAGINATION_LAYOUT.pageHeightIn * paperZoom
  const scaledPageGapRem = PAGINATION_LAYOUT.pageGapRem * paperZoom
  const scaledStackHeight = `calc(${pageCount} * ${scaledPageHeightIn}in + ${pageGapCount} * ${scaledPageGapRem}rem)`
  const layoutVars = {
    ...getPaginationCssVars(pageCount),
    "--paper-zoom": String(paperZoom),
  } as CSSProperties

  return (
    <div
      className="screenplay-zoom-frame"
      data-paper-zoom={paperZoom}
      style={{
        ...layoutVars,
        width: `${scaledPageWidthIn}in`,
        minHeight: scaledStackHeight,
        display: hidden ? "none" : undefined,
      }}
    >
      <div
        className="screenplay-stack"
        data-page-count={pageCount}
        style={{ transform: "scale(var(--paper-zoom))" }}
      >
        <div className="screenplay-page-stack" aria-hidden="true">
          {Array.from({ length: pageCount }, (_, index) => (
            <div
              key={index}
              className="screenplay-page-surface"
              style={{
                top: `calc(${index} * (var(--page-height) + var(--page-gap)))`,
              }}
            >
              {index > 0 && (
                <span className="screenplay-page-chrome-number">
                  {index + 1}.
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="screenplay-editor-shell">
          {children}
        </div>
      </div>
    </div>
  )
}
