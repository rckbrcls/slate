import { useEffect, useRef, useState } from "react"
import { FileWarning } from "lucide-react"
import { getDocument, GlobalWorkerOptions, type PDFPageProxy } from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import type { AnalysisRun, NormalizedDocument } from "../../../electron/shared/types"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface PdfAnnotation {
  id: string
  label: string
  left: number
  top: number
  right: number
  bottom: number
}

function PdfPage({ page, annotations }: { page: PDFPageProxy; annotations: PdfAnnotation[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scale = 1.25
  const viewport = page.getViewport({ scale })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const outputScale = window.devicePixelRatio || 1
    const context = canvas.getContext("2d")
    if (!context) return
    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(viewport.height * outputScale)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`
    const task = page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
    })
    return () => task.cancel()
  }, [page, viewport])

  return (
    <div className="relative max-w-full" style={{ width: viewport.width, height: viewport.height }}>
      <canvas ref={canvasRef} className="max-w-full bg-white shadow-[0_1px_0_rgba(0,0,0,0.25)]" />
      {annotations.map((annotation) => (
        <span
          key={`${annotation.id}-${annotation.left}-${annotation.top}`}
          title={annotation.label}
          className="pointer-events-none absolute border-l-2 border-amber-500 bg-amber-300/30"
          style={{
            left: annotation.left * scale,
            top: annotation.top * scale,
            width: Math.max(4, (annotation.right - annotation.left) * scale),
            height: Math.max(4, (annotation.bottom - annotation.top) * scale),
          }}
        />
      ))}
    </div>
  )
}

function PdfError({ message }: { message: string }) {
  return (
    <div className="grid min-h-80 place-items-center p-8 text-center">
      <div>
        <FileWarning className="mx-auto size-6 text-destructive" />
        <p className="mt-4 text-sm font-medium">Document preview unavailable</p>
        <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export function PdfCanvasReader({
  data,
  document,
  analysis,
}: {
  data: Uint8Array
  document: NormalizedDocument
  analysis: AnalysisRun
}) {
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const task = getDocument({ data })
    let active = true
    task.promise
      .then(async (loaded) => {
        if (!active) return
        setPages(await Promise.all(
          Array.from({ length: loaded.numPages }, (_, index) => loaded.getPage(index + 1)),
        ))
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
    return () => {
      active = false
      void task.destroy()
    }
  }, [data])

  if (error) return <PdfError message={error} />
  if (pages.length === 0) return <div className="py-20 text-center text-sm text-muted-foreground">Rendering PDF...</div>
  const elementMap = new Map(document.elements.map((element) => [element.id, element]))
  const annotationMap = new Map<number, PdfAnnotation[]>()
  for (const finding of analysis.findings) {
    for (const elementId of finding.elementIds) {
      const element = elementMap.get(elementId)
      if (!element?.page || !element.boundingBox) continue
      const current = annotationMap.get(element.page) ?? []
      current.push({ id: element.id, label: finding.title, ...element.boundingBox })
      annotationMap.set(element.page, current)
    }
  }
  return (
    <div className="flex flex-col items-center gap-6 bg-[#171816] px-8 py-8">
      {pages.map((page) => (
        <PdfPage
          key={page.pageNumber}
          page={page}
          annotations={annotationMap.get(page.pageNumber) ?? []}
        />
      ))}
    </div>
  )
}
