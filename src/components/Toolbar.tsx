import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlignLeft,
  ArrowRight,
  FilePlus,
  FolderOpen,
  Save,
  SaveAll,
  BookOpen,
  Download,
  BarChart3,
  Hash,
  Lock,
  Unlock,
  Palette,
  Home,
  Clapperboard,
  FileText,
  MessageSquare,
  Parentheses,
  StickyNote,
  Type,
  User,
  PanelLeft,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { REVISION_COLORS, type RevisionColorIndex } from "@/extensions/RevisionMark"
import { formatPaperZoomPercent } from "@/lib/paperZoom"
import { cn } from "@/lib/utils"

const shouldReserveTrafficLightSpace =
  typeof navigator !== "undefined" && navigator.platform.includes("Mac")

export type ScreenplayElementType =
  | "sceneHeading"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition"
  | "section"
  | "synopsis"
  | "note"

interface ToolbarProps {
  fileName: string
  isDirty: boolean
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onToggleTitlePage?: () => void
  hasTitlePage?: boolean
  onExportPDF?: () => void
  onExportFDX?: () => void
  onOpenStats?: () => void
  showStats?: boolean
  paperZoom?: number
  canZoomIn?: boolean
  canZoomOut?: boolean
  canResetZoom?: boolean
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetZoom?: () => void
  onToggleFileExplorer?: () => void
  showFileExplorer?: boolean
  onSetScreenplayElement?: (element: ScreenplayElementType) => void
  onInsertPageBreak?: () => void
  // Production mode
  productionMode?: boolean
  onAutoNumber?: () => void
  onLockScenes?: () => void
  onUnlockScenes?: () => void
  onClearNumbers?: () => void
  onSetRevisionColor?: (color: RevisionColorIndex) => void
  onCloseProject?: () => void
}

function ToolbarButton({
  onClick,
  title,
  disabled = false,
  children,
}: {
  onClick: () => void
  title: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          disabled={disabled}
          aria-label={title}
          className="app-no-drag"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{title}</TooltipContent>
    </Tooltip>
  )
}

export function Toolbar({
  fileName,
  isDirty,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onToggleTitlePage,
  hasTitlePage,
  onExportPDF,
  onExportFDX,
  onOpenStats,
  showStats,
  paperZoom,
  canZoomIn,
  canZoomOut,
  canResetZoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFileExplorer,
  showFileExplorer,
  onSetScreenplayElement,
  onInsertPageBreak,
  onAutoNumber,
  onLockScenes,
  onUnlockScenes,
  onClearNumbers,
  onSetRevisionColor,
  onCloseProject,
}: ToolbarProps) {
  return (
    <header
      className={cn(
        "app-drag-region relative z-20 flex h-12 shrink-0 items-center gap-1 rounded-b-xl border border-t-0 border-border/70 bg-card/95 px-3",
        shouldReserveTrafficLightSpace && "pl-[88px]",
      )}
    >
      <div className="app-no-drag flex items-center gap-1">
        {(onCloseProject || onToggleFileExplorer) && (
          <>
            {onCloseProject && (
              <ToolbarButton onClick={onCloseProject} title="Back to Projects">
                <Home className="size-4" />
              </ToolbarButton>
            )}
            {onToggleFileExplorer && (
              <ToolbarButton onClick={onToggleFileExplorer} title="Toggle Sidebar">
                <PanelLeft className={`size-4 ${showFileExplorer ? "text-primary" : ""}`} />
              </ToolbarButton>
            )}
            <Separator orientation="vertical" className="mx-1 h-5" />
          </>
        )}

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="app-no-drag">
                  <FileText className="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">File</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>File</DropdownMenuLabel>
            <DropdownMenuItem onClick={onNew}>
              <FilePlus className="mr-2 size-3.5" />
              New
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpen}>
              <FolderOpen className="mr-2 size-3.5" />
              Open
              <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSave}>
              <Save className="mr-2 size-3.5" />
              Save
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSaveAs}>
              <SaveAll className="mr-2 size-3.5" />
              Save As
              <DropdownMenuShortcut>⇧⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            {onToggleTitlePage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleTitlePage}>
                  <BookOpen className="mr-2 size-3.5" />
                  {hasTitlePage ? "Edit Title Page" : "Title Page"}
                </DropdownMenuItem>
              </>
            )}
            {(onExportPDF || onExportFDX) && (
              <>
                <DropdownMenuSeparator />
                {onExportPDF && (
                  <DropdownMenuItem onClick={onExportPDF}>
                    <Download className="mr-2 size-3.5" />
                    Export PDF
                    <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                  </DropdownMenuItem>
                )}
                {onExportFDX && (
                  <DropdownMenuItem onClick={onExportFDX}>
                    <Download className="mr-2 size-3.5" />
                    Export FDX
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {(onSetScreenplayElement || onInsertPageBreak) && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="app-no-drag">
                    <Clapperboard className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Script</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Script Elements</DropdownMenuLabel>
              {onSetScreenplayElement && (
                <>
                  <DropdownMenuItem onClick={() => onSetScreenplayElement("sceneHeading")}>
                    <Clapperboard className="mr-2 size-3.5" />
                    Scene Heading
                    <DropdownMenuShortcut>⇧Tab</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetScreenplayElement("action")}>
                    <AlignLeft className="mr-2 size-3.5" />
                    Action
                    <DropdownMenuShortcut>Tab</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetScreenplayElement("character")}>
                    <User className="mr-2 size-3.5" />
                    Character
                    <DropdownMenuShortcut>Tab</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetScreenplayElement("dialogue")}>
                    <MessageSquare className="mr-2 size-3.5" />
                    Dialogue
                    <DropdownMenuShortcut>Enter</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetScreenplayElement("parenthetical")}>
                    <Parentheses className="mr-2 size-3.5" />
                    Parenthetical
                    <DropdownMenuShortcut>(</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetScreenplayElement("transition")}>
                    <ArrowRight className="mr-2 size-3.5" />
                    Transition
                    <DropdownMenuShortcut>⇧Tab</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSetScreenplayElement("section")}>
                    <Hash className="mr-2 size-3.5" />
                    Section
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetScreenplayElement("synopsis")}>
                    <Type className="mr-2 size-3.5" />
                    Synopsis
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetScreenplayElement("note")}>
                    <StickyNote className="mr-2 size-3.5" />
                    Note
                  </DropdownMenuItem>
                </>
              )}
              {onInsertPageBreak && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onInsertPageBreak}>
                    <FileText className="mr-2 size-3.5" />
                    Page Break
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Production Mode Controls */}
        {(onAutoNumber || onSetRevisionColor) && (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />

            {onAutoNumber && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="app-no-drag">
                        <Hash className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Scene Numbers</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Scene Numbers</DropdownMenuLabel>
                  <DropdownMenuItem onClick={onAutoNumber}>
                    <Hash className="mr-2 size-3.5" />
                    Auto-Number
                  </DropdownMenuItem>
                  {onLockScenes && (
                    <DropdownMenuItem onClick={onLockScenes}>
                      <Lock className="mr-2 size-3.5" />
                      Lock Numbers
                    </DropdownMenuItem>
                  )}
                  {onUnlockScenes && (
                    <DropdownMenuItem onClick={onUnlockScenes}>
                      <Unlock className="mr-2 size-3.5" />
                      Unlock Numbers
                    </DropdownMenuItem>
                  )}
                  {onClearNumbers && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onClearNumbers} variant="destructive">
                        Clear All Numbers
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {onSetRevisionColor && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="app-no-drag">
                        <Palette className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Revision Color</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Revision Color</DropdownMenuLabel>
                  {REVISION_COLORS.map((color) => (
                    <DropdownMenuItem
                      key={color.value}
                      onClick={() => onSetRevisionColor(color.value as RevisionColorIndex)}
                    >
                      <span
                        className="mr-2 inline-block size-3.5 rounded border border-border"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>

      <div className="ml-3 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{fileName}</span>
        {isDirty && (
          <span className="size-2 rounded-full bg-primary" title="Unsaved changes" />
        )}
      </div>

      <div className="app-no-drag ml-auto flex items-center gap-1">
        {typeof paperZoom === "number" && onZoomIn && onZoomOut && onResetZoom && (
          <>
            <div
              className="flex h-8 items-center gap-px rounded-full border border-border/70 bg-muted/40 p-0.5"
              aria-label="Paper Zoom"
            >
              <ToolbarButton
                onClick={onZoomOut}
                title="Zoom Out"
                disabled={!canZoomOut}
              >
                <ZoomOut className="size-4" />
              </ToolbarButton>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={onResetZoom}
                    disabled={!canResetZoom}
                    aria-label="Reset Zoom"
                    className="app-no-drag h-7 min-w-16 px-2 font-mono text-xs tabular-nums"
                  >
                    <RotateCcw className="size-3.5" />
                    {formatPaperZoomPercent(paperZoom)}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Reset Zoom</TooltipContent>
              </Tooltip>
              <ToolbarButton
                onClick={onZoomIn}
                title="Zoom In"
                disabled={!canZoomIn}
              >
                <ZoomIn className="size-4" />
              </ToolbarButton>
            </div>
            <Separator orientation="vertical" className="mx-1 h-5" />
          </>
        )}

        {onOpenStats && (
          <ToolbarButton onClick={onOpenStats} title="Statistics">
            <BarChart3 className={`size-4 ${showStats ? "text-primary" : ""}`} />
          </ToolbarButton>
        )}
      </div>
    </header>
  )
}
