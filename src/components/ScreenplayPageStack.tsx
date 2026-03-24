import type { CSSProperties, ReactNode } from "react"
import { getPaginationCssVars } from "@/lib/paginationLayout"

interface ScreenplayPageStackProps {
  totalPages: number
  hidden?: boolean
  children: ReactNode
}

export function ScreenplayPageStack({
  totalPages,
  hidden = false,
  children,
}: ScreenplayPageStackProps) {
  const pageCount = Math.max(totalPages, 1)
  const layoutVars = getPaginationCssVars(pageCount) as CSSProperties

  return (
    <div
      className="screenplay-stack"
      data-page-count={pageCount}
      style={{ ...layoutVars, display: hidden ? "none" : undefined }}
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
  )
}
