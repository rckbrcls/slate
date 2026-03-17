export interface BeatDefinition {
  name: string
  pagePercent: number
  act: 1 | 2 | 3
}

export const SAVE_THE_CAT_BEATS: BeatDefinition[] = [
  { name: "Opening Image", pagePercent: 0.01, act: 1 },
  { name: "Theme Stated", pagePercent: 0.05, act: 1 },
  { name: "Setup", pagePercent: 0.1, act: 1 },
  { name: "Catalyst", pagePercent: 0.12, act: 1 },
  { name: "Debate", pagePercent: 0.15, act: 1 },
  { name: "Break Into Two", pagePercent: 0.25, act: 2 },
  { name: "B Story", pagePercent: 0.27, act: 2 },
  { name: "Fun & Games", pagePercent: 0.35, act: 2 },
  { name: "Midpoint", pagePercent: 0.5, act: 2 },
  { name: "Bad Guys Close In", pagePercent: 0.55, act: 2 },
  { name: "All Is Lost", pagePercent: 0.67, act: 2 },
  { name: "Dark Night of Soul", pagePercent: 0.7, act: 2 },
  { name: "Break Into Three", pagePercent: 0.75, act: 3 },
  { name: "Finale", pagePercent: 0.85, act: 3 },
  { name: "Final Image", pagePercent: 0.99, act: 3 },
]

export interface BeatMarker {
  name: string
  targetPage: number
  act: 1 | 2 | 3
}

export function mapBeatsToPages(totalPages: number): BeatMarker[] {
  return SAVE_THE_CAT_BEATS.map((beat) => ({
    name: beat.name,
    targetPage: Math.max(1, Math.round(beat.pagePercent * totalPages)),
    act: beat.act,
  }))
}
