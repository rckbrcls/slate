import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { paginate, type PaginationResult } from "@/lib/pagination"

export const pageNumbersPluginKey = new PluginKey<PaginationResult>("pageNumbers")

export const PageNumbers = Extension.create({
  name: "pageNumbers",

  addProseMirrorPlugins() {
    return [
      new Plugin<PaginationResult>({
        key: pageNumbersPluginKey,

        state: {
          init(_, state): PaginationResult {
            return paginate(state.doc)
          },

          apply(tr, prev): PaginationResult {
            if (!tr.docChanged) return prev
            return paginate(tr.doc)
          },
        },

        props: {
          decorations(state) {
            const result = pageNumbersPluginKey.getState(state)
            if (!result || result.pageBreaks.length === 0) return DecorationSet.empty

            const decorations: Decoration[] = []

            for (const pb of result.pageBreaks) {
              // Clamp position to valid range
              const pos = Math.min(pb.afterPos, state.doc.content.size)
              if (pos <= 0) continue

              // Page break line widget
              const breakWidget = Decoration.widget(pos, () => {
                const el = document.createElement("div")
                el.className = "screenplay-page-break-marker"
                el.setAttribute("contenteditable", "false")

                // Page number on the right (show next page number)
                const pageNum = document.createElement("span")
                pageNum.className = "screenplay-page-number"
                pageNum.textContent = `${pb.pageNumber + 1}.`
                el.appendChild(pageNum)

                // (MORE) indicator
                if (pb.more) {
                  const more = document.createElement("span")
                  more.className = "screenplay-more-indicator"
                  more.textContent = "(MORE)"
                  el.appendChild(more)
                }

                // CONT'D indicator
                if (pb.contdCharacter) {
                  const contd = document.createElement("div")
                  contd.className = "screenplay-contd-indicator"
                  contd.textContent = `${pb.contdCharacter} (CONT'D)`
                  el.appendChild(contd)
                }

                return el
              }, { side: 1 })

              decorations.push(breakWidget)
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
