import { lazy, Suspense, useMemo, useState } from "react"
import { Filter } from "lucide-react"
import type { AnalysisRun, DocumentElement, NormalizedDocument } from "../../../electron/shared/types"
import { Button } from "@/components/ui/button"

const PdfCanvasReader = lazy(() =>
  import("@/components/intelligence/PdfCanvasReader").then((module) => ({
    default: module.PdfCanvasReader,
  })),
)

function NormalizedElement({ element, highlighted }: { element: DocumentElement; highlighted: boolean }) {
  if (element.kind === "heading") {
    return <h2 id={element.id} className={`mt-10 font-heading text-xl ${highlighted ? "slate-finding-highlight" : ""}`}>{element.text}</h2>
  }
  if (element.kind === "bullet") {
    return <li id={element.id} className={`ml-5 pl-2 ${highlighted ? "slate-finding-highlight" : ""}`}>{element.text}</li>
  }
  if (element.kind === "scene-heading") {
    return <h3 id={element.id} className={`mt-8 font-mono text-xs font-bold uppercase tracking-wide ${highlighted ? "slate-finding-highlight" : ""}`}>{element.text}</h3>
  }
  if (element.kind === "character") {
    return <p id={element.id} className={`mt-6 pl-[38%] font-mono text-sm uppercase ${highlighted ? "slate-finding-highlight" : ""}`}>{element.text}</p>
  }
  if (element.kind === "dialogue") {
    return <p id={element.id} className={`mx-auto mt-1 max-w-[58%] font-mono text-sm leading-6 ${highlighted ? "slate-finding-highlight" : ""}`}>{element.text}</p>
  }
  return <p id={element.id} className={`mt-5 whitespace-pre-wrap leading-7 ${highlighted ? "slate-finding-highlight" : ""}`}>{element.text}</p>
}

interface DocumentReaderProps {
  document: NormalizedDocument
  analysis: AnalysisRun
  pdfData: Uint8Array | null
}

export function DocumentReader({ document, analysis, pdfData }: DocumentReaderProps) {
  const [showFindingsOnly, setShowFindingsOnly] = useState(false)
  const findingIds = useMemo(
    () => new Set(analysis.findings.flatMap((finding) => finding.elementIds)),
    [analysis.findings],
  )
  const visibleElements = showFindingsOnly
    ? document.elements.filter((element) => findingIds.has(element.id))
    : document.elements

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-h-0 overflow-auto bg-[#20211f]">
        {document.metadata.sourceFormat === "pdf" ? (
          pdfData ? (
            <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading PDF renderer...</div>}>
              <PdfCanvasReader data={pdfData} document={document} analysis={analysis} />
            </Suspense>
          ) : <div className="py-20 text-center text-sm text-muted-foreground">Loading PDF...</div>
        ) : (
          <article className="mx-auto my-8 min-h-[70vh] w-[min(760px,calc(100%-3rem))] bg-[#f2efe7] px-12 py-14 font-serif text-[15px] text-[#282925] shadow-[0_1px_0_rgba(0,0,0,0.3)]">
            {visibleElements.length > 0
              ? visibleElements.map((element) => (
                  <NormalizedElement key={element.id} element={element} highlighted={findingIds.has(element.id)} />
                ))
              : <p className="text-center text-sm text-[#66685f]">No annotated content matches this filter.</p>}
          </article>
        )}
      </section>

      <aside className="border-l border-border bg-background p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Annotations</h3>
            <p className="mt-1 text-xs text-muted-foreground">{analysis.findings.length} findings</p>
          </div>
          <Button
            variant={showFindingsOnly ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setShowFindingsOnly((current) => !current)}
            aria-pressed={showFindingsOnly}
            title="Show annotated content only"
          >
            <Filter className="size-4" />
          </Button>
        </div>
        <div className="mt-5 divide-y divide-border border-y border-border">
          {analysis.findings.length === 0 ? (
            <p className="py-5 text-xs leading-5 text-muted-foreground">No annotations for this version.</p>
          ) : analysis.findings.map((finding) => (
            <button
              type="button"
              key={`${finding.key}-${finding.elementIds.join("-")}`}
              className="block w-full py-4 text-left focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => {
                const elementId = finding.elementIds[0]
                if (elementId) {
                  window.document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              }}
            >
              <span className="text-xs font-semibold">{finding.title}</span>
              <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{finding.description}</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}
