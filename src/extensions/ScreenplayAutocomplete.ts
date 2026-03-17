import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { getSuggestions } from "@/lib/suggestions"

export interface AutocompleteState {
  active: boolean
  items: string[]
  query: string
  nodeType: string
  from: number
  to: number
}

export const autocompletePluginKey = new PluginKey<AutocompleteState>(
  "screenplayAutocomplete",
)

const AUTOCOMPLETE_TYPES = new Set(["character", "sceneHeading", "transition"])

export const ScreenplayAutocomplete = Extension.create({
  name: "screenplayAutocomplete",

  addProseMirrorPlugins() {
    return [
      new Plugin<AutocompleteState>({
        key: autocompletePluginKey,

        state: {
          init(): AutocompleteState {
            return {
              active: false,
              items: [],
              query: "",
              nodeType: "",
              from: 0,
              to: 0,
            }
          },

          apply(tr, prev): AutocompleteState {
            const { selection } = tr
            const { $from } = selection

            // Only activate for specific node types
            const nodeType = $from.parent.type.name
            if (!AUTOCOMPLETE_TYPES.has(nodeType)) {
              return { ...prev, active: false, items: [] }
            }

            const query = $from.parent.textContent
            const items = getSuggestions(tr.doc, nodeType, query)

            if (items.length === 0) {
              return { ...prev, active: false, items: [] }
            }

            return {
              active: true,
              items,
              query,
              nodeType,
              from: $from.before($from.depth) + 1,
              to: $from.after($from.depth) - 1,
            }
          },
        },
      }),
    ]
  },
})
