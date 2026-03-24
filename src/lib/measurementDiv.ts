import type { Node as PmNode } from "@tiptap/pm/model"
import { DOMSerializer } from "@tiptap/pm/model"
import type { EditorView } from "@tiptap/pm/view"
import { PAGINATION_LAYOUT } from "./paginationLayout"

export interface MeasurementService {
  measureNode(node: PmNode): number
  measureNodes(nodes: PmNode[]): number
  destroy(): void
}

/**
 * Creates a hidden measurement div that mirrors the editor's CSS
 * and measures ProseMirror nodes by serializing them to DOM in isolation.
 *
 * This avoids the feedback loop where measuring nodes inside the editor
 * DOM includes widget decorations (page break markers) in the measurements.
 */
export function createMeasurementService(editorView: EditorView): MeasurementService {
  const doc = editorView.dom.ownerDocument
  const schema = editorView.state.schema
  const serializer = DOMSerializer.fromSchema(schema)

  // Create offscreen container with identical CSS to the editor
  const container = doc.createElement("div")
  container.className = "screenplay-editor"
  container.setAttribute("aria-hidden", "true")
  container.style.position = "absolute"
  container.style.left = "-9999px"
  container.style.top = "0"
  container.style.visibility = "hidden"
  container.style.pointerEvents = "none"
  container.style.width = `${PAGINATION_LAYOUT.textWidthPx}px`
  doc.body.appendChild(container)

  // Cache: keyed by node type + text content
  const cache = new Map<string, number>()

  // Invalidate cache when fonts finish loading
  if (doc.fonts?.ready) {
    doc.fonts.ready.then(() => cache.clear())
  }

  function cacheKey(node: PmNode): string {
    return `${node.type.name}:${node.textContent}`
  }

  function measureSingleNode(node: PmNode): number {
    const key = cacheKey(node)
    const cached = cache.get(key)
    if (cached !== undefined) return cached

    const dom = serializer.serializeNode(node) as HTMLElement
    container.appendChild(dom)

    const style = doc.defaultView!.getComputedStyle(dom)
    const marginTop = parseFloat(style.marginTop) || 0
    const marginBottom = parseFloat(style.marginBottom) || 0
    const height = dom.getBoundingClientRect().height + marginTop + marginBottom

    container.removeChild(dom)

    cache.set(key, height)
    return height
  }

  function measureMultipleNodes(nodes: PmNode[]): number {
    if (nodes.length === 0) return 0
    if (nodes.length === 1) return measureSingleNode(nodes[0])

    // Serialize all nodes into a wrapper to measure holistically
    // (avoids subpixel accumulation from measuring individually)
    const wrapper = doc.createElement("div")
    wrapper.style.margin = "0"
    wrapper.style.padding = "0"

    for (const node of nodes) {
      const dom = serializer.serializeNode(node)
      wrapper.appendChild(dom)
    }

    container.appendChild(wrapper)
    const height = wrapper.getBoundingClientRect().height
    container.removeChild(wrapper)

    return height
  }

  return {
    measureNode: measureSingleNode,
    measureNodes: measureMultipleNodes,
    destroy() {
      container.remove()
      cache.clear()
    },
  }
}
