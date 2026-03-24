import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { paginate, paginateMeasured, paginateIncremental, type PaginationResult } from "@/lib/pagination"
import { createMeasurementService, type MeasurementService } from "@/lib/measurementDiv"
import { PAGINATION_LAYOUT } from "@/lib/paginationLayout"

export const pageNumbersPluginKey = new PluginKey<PaginationResult>("pageNumbers")

export const PageNumbers = Extension.create({
  name: "pageNumbers",

  addProseMirrorPlugins() {
    return [
      new Plugin<PaginationResult>({
        key: pageNumbersPluginKey,

        state: {
          init(_, state): PaginationResult {
            // No view yet — use sync character-estimate fallback
            return paginate(state.doc)
          },

          apply(tr, prev): PaginationResult {
            const measured = tr.getMeta(pageNumbersPluginKey) as PaginationResult | undefined
            if (measured) return measured
            if (!tr.docChanged) return prev
            // Sync fallback while waiting for async measurement
            return paginate(tr.doc)
          },
        },

        view(view) {
          let currentView = view
          let frameId: number | null = null
          let resizeObserver: ResizeObserver | null = null
          let measurementService: MeasurementService | null = null
          let lastChangePos: number | undefined

          const ensureMeasurementService = () => {
            if (!measurementService) {
              measurementService = createMeasurementService(currentView)
            }
            return measurementService
          }

          const scheduleMeasure = (changePos?: number) => {
            if (frameId !== null) return
            lastChangePos = changePos

            frameId = window.requestAnimationFrame(() => {
              frameId = null
              const service = ensureMeasurementService()
              const { contentHeightPx } = PAGINATION_LAYOUT
              const current = pageNumbersPluginKey.getState(currentView.state)

              let next: PaginationResult

              // Try incremental if we have a previous result and a change position
              if (current && lastChangePos !== undefined && current.pageBreaks.length > 0) {
                next = paginateIncremental(
                  currentView.state.doc,
                  service.measureNode,
                  contentHeightPx,
                  current,
                  lastChangePos,
                )
              } else {
                next = paginateMeasured(
                  currentView.state.doc,
                  service.measureNode,
                  contentHeightPx,
                )
              }

              lastChangePos = undefined

              if (
                current?.totalPages === next.totalPages &&
                JSON.stringify(current?.pageBreaks ?? []) === JSON.stringify(next.pageBreaks)
              ) {
                return
              }

              currentView.dispatch(currentView.state.tr.setMeta(pageNumbersPluginKey, next))
            })
          }

          // Initial async measurement
          scheduleMeasure()

          if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
              scheduleMeasure()
            })
            resizeObserver.observe(currentView.dom)
          }

          return {
            update(nextView, prevState) {
              currentView = nextView
              if (nextView.state.doc !== prevState.doc) {
                // Find approximate change position from the transaction
                const tr = nextView.state.tr
                let changePos: number | undefined
                if (tr.steps.length > 0) {
                  changePos = tr.steps[0].getMap().forEach((oldStart: number) => {
                    changePos = changePos === undefined ? oldStart : Math.min(changePos, oldStart)
                  }) as unknown as number
                  // forEach doesn't return — extract from mapping
                  changePos = undefined
                  tr.mapping.maps.forEach((map) => {
                    map.forEach((oldStart: number) => {
                      changePos = changePos === undefined ? oldStart : Math.min(changePos, oldStart)
                    })
                  })
                }
                scheduleMeasure(changePos)
              }
            },
            destroy() {
              if (frameId !== null) {
                window.cancelAnimationFrame(frameId)
              }
              resizeObserver?.disconnect()
              measurementService?.destroy()
            },
          }
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

              const breakWidget = Decoration.widget(pos, () => {
                const el = document.createElement("div")
                el.className = "screenplay-page-break-marker"
                el.setAttribute("contenteditable", "false")

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
              }, { side: 1, key: `pb-${pb.pageNumber}` })

              decorations.push(breakWidget)
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
