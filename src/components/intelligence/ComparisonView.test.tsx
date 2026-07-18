// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ComparisonView } from "./ComparisonView"

describe("ComparisonView", () => {
  it("explains why comparison is unavailable with one version", () => {
    render(
      <ComparisonView
        versions={[{
          id: "v1",
          ordinal: 1,
          sourceName: "draft.txt",
          sourceFormat: "txt",
          contentHash: "a".repeat(64),
          importedAt: "2026-01-01T00:00:00Z",
          note: null,
        }]}
        baseVersionId="v1"
        targetVersionId="v1"
        onBaseChange={vi.fn()}
        onTargetChange={vi.fn()}
        comparison={null}
        loading={false}
      />,
    )

    expect(screen.getByText("A second version unlocks comparison")).toBeTruthy()
  })
})
