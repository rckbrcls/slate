import { Bold } from "@tiptap/extension-bold"
import { Italic } from "@tiptap/extension-italic"
import { Underline } from "@tiptap/extension-underline"
import { Text } from "@tiptap/extension-text"
import { HardBreak } from "@tiptap/extension-hard-break"
import { History } from "@tiptap/extension-history"
import { Placeholder } from "@tiptap/extension-placeholder"
import { ScreenplayDocument } from "./ScreenplayDocument"
import { SceneHeading } from "./SceneHeading"
import { Action } from "./Action"
import { Character } from "./Character"
import { Dialogue } from "./Dialogue"
import { Parenthetical } from "./Parenthetical"
import { Transition } from "./Transition"
import { DualDialogue } from "./DualDialogue"
import { DualDialogueColumn } from "./DualDialogueColumn"
import { PageBreak } from "./PageBreak"
import { Section } from "./Section"
import { Synopsis } from "./Synopsis"
import { Note } from "./Note"
import { ScreenplayKeymap } from "./ScreenplayKeymap"
import { ScreenplayAutocomplete } from "./ScreenplayAutocomplete"
import { PageNumbers } from "./PageNumbers"
import { AIDiff } from "./AIDiff"
import { RevisionMark } from "./RevisionMark"

export {
  ScreenplayDocument,
  SceneHeading,
  Action,
  Character,
  Dialogue,
  Parenthetical,
  Transition,
  DualDialogue,
  DualDialogueColumn,
  PageBreak,
  Section,
  Synopsis,
  Note,
}

export const screenplayExtensions = [
  ScreenplayDocument,
  Text,
  HardBreak,
  History,
  SceneHeading,
  Action,
  Character,
  Dialogue,
  Parenthetical,
  Transition,
  DualDialogue,
  DualDialogueColumn,
  PageBreak,
  Section,
  Synopsis,
  Note,
  ScreenplayKeymap,
  ScreenplayAutocomplete,
  PageNumbers,
  AIDiff,
  RevisionMark,
  Bold,
  Italic,
  Underline,
  Placeholder.configure({
    placeholder: ({ node }) => {
      switch (node.type.name) {
        case "sceneHeading":
          return "INT./EXT. LOCATION - TIME"
        case "action":
          return "Action description..."
        case "character":
          return "CHARACTER NAME"
        case "dialogue":
          return "Dialogue..."
        case "parenthetical":
          return "(parenthetical)"
        case "transition":
          return "CUT TO:"
        default:
          return ""
      }
    },
  }),
]
