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
  FilePlus,
  FolderOpen,
  Save,
  SaveAll,
  BookOpen,
  Download,
  Bot,
  BarChart3,
  FolderTree,
  Hash,
  Lock,
  Unlock,
  Palette,
  Home,
} from "lucide-react"
import { REVISION_COLORS, type RevisionColorIndex } from "@/extensions/RevisionMark"

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
  onToggleAI?: () => void
  showAI?: boolean
  onOpenStats?: () => void
  onToggleFileExplorer?: () => void
  showFileExplorer?: boolean
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
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={onClick}>
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
  onToggleAI,
  showAI,
  onOpenStats,
  onToggleFileExplorer,
  showFileExplorer,
  onAutoNumber,
  onLockScenes,
  onUnlockScenes,
  onClearNumbers,
  onSetRevisionColor,
  onCloseProject,
}: ToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-3">
      <div className="flex items-center gap-1">
        {onCloseProject && (
          <>
            <ToolbarButton onClick={onCloseProject} title="Back to Projects">
              <Home className="size-4" />
            </ToolbarButton>
            <Separator orientation="vertical" className="mx-1 h-5" />
          </>
        )}
        <ToolbarButton onClick={onNew} title="New (⌘N)">
          <FilePlus className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onOpen} title="Open (⌘O)">
          <FolderOpen className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onSave} title="Save (⌘S)">
          <Save className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onSaveAs} title="Save As (⌘⇧S)">
          <SaveAll className="size-4" />
        </ToolbarButton>

        {hasTitlePage && onToggleTitlePage && (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <ToolbarButton onClick={onToggleTitlePage} title="Title Page">
              <BookOpen className="size-4" />
            </ToolbarButton>
          </>
        )}

        {(onExportPDF || onExportFDX) && (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <Download className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Export</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start">
                {onExportPDF && (
                  <DropdownMenuItem onClick={onExportPDF}>
                    Export as PDF
                    <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                  </DropdownMenuItem>
                )}
                {onExportFDX && (
                  <DropdownMenuItem onClick={onExportFDX}>
                    Export as FDX (Final Draft)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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
                      <Button variant="ghost" size="icon-sm">
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
                      <Button variant="ghost" size="icon-sm">
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
          <span className="size-2 rounded-full bg-orange-400" title="Unsaved changes" />
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {onToggleFileExplorer && (
          <ToolbarButton onClick={onToggleFileExplorer} title="File Explorer">
            <FolderTree className={`size-4 ${showFileExplorer ? "text-primary" : ""}`} />
          </ToolbarButton>
        )}
        {onOpenStats && (
          <ToolbarButton onClick={onOpenStats} title="Statistics">
            <BarChart3 className="size-4" />
          </ToolbarButton>
        )}
        {onToggleAI && (
          <ToolbarButton onClick={onToggleAI} title="AI Assistant">
            <Bot className={`size-4 ${showAI ? "text-primary" : ""}`} />
          </ToolbarButton>
        )}
      </div>
    </header>
  )
}
