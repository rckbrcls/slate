import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export interface DiffHunk {
  type: "added" | "removed"
  fromPos: number
  toPos: number
  text: string
}

export interface AIDiffState {
  hunks: DiffHunk[]
  mode: "idle" | "reviewing"
}

export const aiDiffPluginKey = new PluginKey<AIDiffState>("aiDiff")

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiDiff: {
      setDiffHunks: (hunks: DiffHunk[]) => ReturnType
      clearDiff: () => ReturnType
      acceptAll: () => ReturnType
      rejectAll: () => ReturnType
    }
  }
}

export const AIDiff = Extension.create({
  name: "aiDiff",

  addCommands() {
    return {
      setDiffHunks:
        (hunks: DiffHunk[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(aiDiffPluginKey, { hunks, mode: "reviewing" as const })
          }
          return true
        },
      clearDiff:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(aiDiffPluginKey, { hunks: [], mode: "idle" as const })
          }
          return true
        },
      acceptAll:
        () =>
        ({ tr, dispatch }) => {
          // Accept = keep current doc content, just clear the decorations
          if (dispatch) {
            tr.setMeta(aiDiffPluginKey, { hunks: [], mode: "idle" as const })
          }
          return true
        },
      rejectAll:
        () =>
        ({ commands }) => {
          // Reject = handled by the hook (restores original content)
          // Just clear decorations here
          commands.clearDiff()
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<AIDiffState>({
        key: aiDiffPluginKey,

        state: {
          init(): AIDiffState {
            return { hunks: [], mode: "idle" }
          },
          apply(tr, prev): AIDiffState {
            const meta = tr.getMeta(aiDiffPluginKey)
            if (meta) return meta
            return prev
          },
        },

        props: {
          decorations(state) {
            const diffState = aiDiffPluginKey.getState(state)
            if (!diffState || diffState.mode !== "reviewing" || diffState.hunks.length === 0) {
              return DecorationSet.empty
            }

            const decorations: Decoration[] = []

            for (const hunk of diffState.hunks) {
              const from = Math.max(0, hunk.fromPos)
              const to = Math.min(state.doc.content.size, hunk.toPos)

              if (from >= to) continue

              if (hunk.type === "added") {
                decorations.push(
                  Decoration.inline(from, to, {
                    class: "ai-diff-added",
                    style: "background-color: rgba(34, 197, 94, 0.15); border-bottom: 2px solid rgb(34, 197, 94);",
                  }),
                )
              } else {
                decorations.push(
                  Decoration.inline(from, to, {
                    class: "ai-diff-removed",
                    style: "background-color: rgba(239, 68, 68, 0.15); text-decoration: line-through; border-bottom: 2px solid rgb(239, 68, 68);",
                  }),
                )
              }
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
