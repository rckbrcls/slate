import type { TitlePage } from "@/lib/fountain/types"

interface TitlePageViewProps {
  titlePage: TitlePage
  visible: boolean
  onClose: () => void
}

export function TitlePageView({ titlePage, visible, onClose }: TitlePageViewProps) {
  if (!visible) return null

  const hasContent = Object.values(titlePage).some((v) => v && v.trim())
  if (!hasContent) {
    return (
      <div className="screenplay-page screenplay-title-page" onClick={onClose}>
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p className="font-[Courier_Prime,Courier_New,monospace] text-sm">
            No title page information. Add metadata to your .fountain file.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="screenplay-page screenplay-title-page" onClick={onClose}>
      <div className="flex h-full flex-col justify-between font-[Courier_Prime,Courier_New,monospace] text-[12pt] leading-none text-black">
        {/* Top third: Title + Credit + Author */}
        <div className="mt-[3in] text-center">
          {titlePage.title && (
            <div className="text-[24pt] font-bold leading-tight">
              {titlePage.title}
            </div>
          )}
          {titlePage.credit && (
            <div className="mt-6">{titlePage.credit}</div>
          )}
          {titlePage.author && (
            <div className="mt-4">{titlePage.author}</div>
          )}
          {titlePage.source && (
            <div className="mt-4">{titlePage.source}</div>
          )}
        </div>

        {/* Bottom: Contact + Draft date + Copyright */}
        <div className="mb-0">
          {titlePage.draftDate && (
            <div className="mb-2">{titlePage.draftDate}</div>
          )}
          {titlePage.contact && (
            <div className="whitespace-pre-line">{titlePage.contact}</div>
          )}
          {titlePage.copyright && (
            <div className="mt-2">{titlePage.copyright}</div>
          )}
        </div>
      </div>
    </div>
  )
}
