export interface QuickAction {
  id: string
  label: string
  instruction: string
  icon: string
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "analyze-structure",
    label: "Analyze Structure",
    icon: "layout",
    instruction:
      "Analyze the structure of this screenplay. Identify the act breaks, major turning points, and pacing issues. Provide a summary of the narrative arc and suggestions for improvement.",
  },
  {
    id: "improve-dialogue",
    label: "Improve Dialogue",
    icon: "message-circle",
    instruction:
      "Read this screenplay and improve the naturalness of the dialogue. Make characters sound more distinct from each other. Preserve the meaning and plot points but make conversations feel more authentic and less expository.",
  },
  {
    id: "check-wga",
    label: "Check WGA Format",
    icon: "check-circle",
    instruction:
      "Review this screenplay for WGA formatting compliance. Check scene headings, character cues, transitions, parentheticals, and page layout. Note any formatting issues and fix them.",
  },
  {
    id: "strengthen-act2",
    label: "Strengthen Act 2",
    icon: "trending-up",
    instruction:
      "Analyze the second act of this screenplay (roughly pages 25-85 in a feature). Identify where the midpoint occurs, whether there's sufficient rising action, and if the protagonist faces enough obstacles. Suggest specific improvements to strengthen Act 2.",
  },
  {
    id: "character-consistency",
    label: "Character Consistency",
    icon: "users",
    instruction:
      "Analyze each character in this screenplay for consistency. Check if their voice, motivations, and behavior remain consistent throughout. Flag any contradictions or out-of-character moments and suggest fixes.",
  },
  {
    id: "cut-pages",
    label: "Trim Length",
    icon: "scissors",
    instruction:
      "This screenplay needs to be shorter. Identify scenes that can be cut or condensed, redundant dialogue that can be trimmed, and action lines that can be tightened. Make the edits to reduce the page count by approximately 10% while preserving the core story.",
  },
  {
    id: "bechdel-analysis",
    label: "Bechdel Analysis",
    icon: "heart",
    instruction:
      "Analyze this screenplay using the Bechdel test criteria: (1) Does it have at least two named female characters? (2) Do they talk to each other? (3) About something other than a man? Provide a detailed breakdown and suggestions if the script doesn't pass.",
  },
  {
    id: "world-building",
    label: "World Building",
    icon: "globe",
    instruction:
      "Review the world-building in this screenplay for consistency. Check location descriptions, time continuity, technology level, and setting details. Flag any contradictions or underdeveloped elements and suggest improvements.",
  },
]
