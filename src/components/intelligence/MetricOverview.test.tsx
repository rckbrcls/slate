// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MetricOverview } from "./MetricOverview"

describe("MetricOverview", () => {
  it("shows reproducible metrics and the empty finding state", () => {
    render(
      <MetricOverview
        comparison={null}
        analysis={{
          runId: "run-1",
          versionId: "version-1",
          packId: "general-v1",
          algorithmVersion: "deterministic-1",
          startedAt: "2026-01-01T00:00:00Z",
          completedAt: "2026-01-01T00:00:00Z",
          durationMs: 4,
          metrics: [
            {
              key: "word-count",
              label: "Words",
              value: 240,
              kind: "number",
              unit: null,
              description: "Total tokenized words.",
            },
          ],
          findings: [],
        }}
      />,
    )

    expect(screen.getByText("240")).toBeTruthy()
    expect(screen.getByText("No findings for this pack and version.")).toBeTruthy()
    expect(screen.getByText(/deterministic-1/)).toBeTruthy()
  })
})
