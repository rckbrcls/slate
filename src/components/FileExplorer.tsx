import { memo, useCallback, useState, type FormEvent, type ReactNode } from "react"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  FileCode,
  File,
  Clipboard,
  FolderSearch,
  Files,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { FileNode } from "@/hooks/useFileExplorer"
import type { GitFileStatus } from "@/lib/git/types"

interface FileExplorerProps {
  tree: FileNode[]
  projectDir: string | null
  loading: boolean
  onToggleFolder: (path: string) => void
  onOpenFile: (path: string) => void
  currentFilePath: string | null
  gitStatus?: GitFileStatus[]
  headerAction?: ReactNode
  onRenameEntry?: (node: FileNode, nextName: string) => boolean | Promise<boolean>
  onDuplicateFile?: (node: FileNode) => boolean | Promise<boolean>
  onMoveToTrash?: (node: FileNode) => boolean | Promise<boolean>
  onRevealEntry?: (node: FileNode) => void | Promise<void>
  onCopyPath?: (node: FileNode) => void | Promise<void>
}

const FOUNTAIN_EXTS = new Set(["fountain", "spmd"])

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (FOUNTAIN_EXTS.has(ext)) return <FileCode className="size-4 shrink-0 text-primary" />
  if (ext === "pdf") return <FileText className="size-4 shrink-0 text-destructive" />
  if (ext === "fdx") return <FileText className="size-4 shrink-0 text-chart-2" />
  return <File className="size-4 text-muted-foreground shrink-0" />
}

function getGitBadge(filePath: string, gitStatus?: GitFileStatus[]) {
  if (!gitStatus) return null
  const entry = gitStatus.find((s) => filePath.endsWith(s.path))
  if (!entry) return null

  const badges: Record<string, { label: string; className: string }> = {
    modified: { label: "M", className: "text-primary" },
    added: { label: "A", className: "text-chart-2" },
    deleted: { label: "D", className: "text-destructive" },
    untracked: { label: "?", className: "text-muted-foreground" },
    staged: { label: "S", className: "text-chart-2" },
  }
  const badge = badges[entry.status]
  if (!badge) return null
  return (
    <span className={`ml-auto text-[10px] font-bold ${badge.className}`}>
      {badge.label}
    </span>
  )
}

const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  onToggleFolder,
  onOpenFile,
  currentFilePath,
  gitStatus,
  onRenameRequest,
  onDuplicateFile,
  onMoveToTrashRequest,
  onRevealEntry,
  onCopyPath,
}: {
  node: FileNode
  depth: number
  onToggleFolder: (path: string) => void
  onOpenFile: (path: string) => void
  currentFilePath: string | null
  gitStatus?: GitFileStatus[]
  onRenameRequest: (node: FileNode) => void
  onDuplicateFile?: (node: FileNode) => void
  onMoveToTrashRequest: (node: FileNode) => void
  onRevealEntry?: (node: FileNode) => void
  onCopyPath?: (node: FileNode) => void
}) {
  const handleClick = useCallback(() => {
    if (node.isDirectory) {
      onToggleFolder(node.path)
    } else {
      onOpenFile(node.path)
    }
  }, [node.path, node.isDirectory, onToggleFolder, onOpenFile])

  const isActive = currentFilePath === node.path
  const paddingLeft = 8 + depth * 16

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            className={`flex w-full items-center gap-1.5 py-1 pr-2 text-xs transition-colors hover:bg-muted/50 ${
              isActive ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
            style={{ paddingLeft }}
          >
            {node.isDirectory ? (
              <>
                {node.expanded ? (
                  <ChevronDown className="size-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0" />
                )}
                <Folder className={`size-4 shrink-0 ${node.expanded ? "text-primary" : "text-muted-foreground"}`} />
              </>
            ) : (
              <>
                <span className="size-3.5 shrink-0" />
                {getFileIcon(node.name)}
              </>
            )}
            <span className="truncate">{node.name}</span>
            {getGitBadge(node.path, gitStatus)}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onSelect={handleClick}>
            {node.isDirectory ? (
              <Folder className="size-3.5" />
            ) : (
              <File className="size-3.5" />
            )}
            Open
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onRenameRequest(node)}>
            <Pencil className="size-3.5" />
            Rename
          </ContextMenuItem>
          {!node.isDirectory && (
            <ContextMenuItem
              disabled={!onDuplicateFile}
              onSelect={() => onDuplicateFile?.(node)}
            >
              <Files className="size-3.5" />
              Duplicate
            </ContextMenuItem>
          )}
          <ContextMenuItem
            disabled={!onCopyPath}
            onSelect={() => onCopyPath?.(node)}
          >
            <Clipboard className="size-3.5" />
            Copy Path
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!onRevealEntry}
            onSelect={() => onRevealEntry?.(node)}
          >
            <FolderSearch className="size-3.5" />
            Reveal in Finder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onSelect={() => onMoveToTrashRequest(node)}
          >
            <Trash2 className="size-3.5" />
            Move to Trash
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {node.isDirectory && node.expanded && node.children?.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          onToggleFolder={onToggleFolder}
          onOpenFile={onOpenFile}
          currentFilePath={currentFilePath}
          gitStatus={gitStatus}
          onRenameRequest={onRenameRequest}
          onDuplicateFile={onDuplicateFile}
          onMoveToTrashRequest={onMoveToTrashRequest}
          onRevealEntry={onRevealEntry}
          onCopyPath={onCopyPath}
        />
      ))}
    </>
  )
})

export function FileExplorer({
  tree,
  projectDir,
  loading,
  onToggleFolder,
  onOpenFile,
  currentFilePath,
  gitStatus,
  headerAction,
  onRenameEntry,
  onDuplicateFile,
  onMoveToTrash,
  onRevealEntry,
  onCopyPath,
}: FileExplorerProps) {
  const [renamingNode, setRenamingNode] = useState<FileNode | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [trashNode, setTrashNode] = useState<FileNode | null>(null)
  const [actionPending, setActionPending] = useState(false)

  const handleRenameRequest = useCallback((node: FileNode) => {
    setRenameValue(node.name)
    setRenamingNode(node)
  }, [])

  const handleRenameSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!renamingNode || !onRenameEntry) return

    const nextName = renameValue.trim()
    if (!nextName || nextName === renamingNode.name) {
      setRenamingNode(null)
      return
    }

    setActionPending(true)
    try {
      const ok = await onRenameEntry(renamingNode, nextName)
      if (ok) {
        setRenamingNode(null)
      }
    } finally {
      setActionPending(false)
    }
  }, [onRenameEntry, renameValue, renamingNode])

  const handleMoveToTrash = useCallback(async () => {
    if (!trashNode || !onMoveToTrash) return

    setActionPending(true)
    try {
      const ok = await onMoveToTrash(trashNode)
      if (ok) {
        setTrashNode(null)
      }
    } finally {
      setActionPending(false)
    }
  }, [onMoveToTrash, trashNode])

  if (!projectDir) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Open a file to see project
        </p>
      </div>
    )
  }

  const dirName = projectDir.split("/").pop() ?? projectDir

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <h3 className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {dirName}
        </h3>
        {headerAction}
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="py-1">
            {tree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                onToggleFolder={onToggleFolder}
                onOpenFile={onOpenFile}
                currentFilePath={currentFilePath}
                gitStatus={gitStatus}
                onRenameRequest={handleRenameRequest}
                onDuplicateFile={onDuplicateFile}
                onMoveToTrashRequest={setTrashNode}
                onRevealEntry={onRevealEntry}
                onCopyPath={onCopyPath}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog
        open={Boolean(renamingNode)}
        onOpenChange={(open) => {
          if (!open && !actionPending) {
            setRenamingNode(null)
          }
        }}
      >
        <DialogContent>
          <form onSubmit={handleRenameSubmit} className="grid gap-6">
            <DialogHeader>
              <DialogTitle>Rename</DialogTitle>
              <DialogDescription>
                Enter a new name for {renamingNode?.name ?? "this item"}.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              autoFocus
              aria-label="New name"
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={actionPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={actionPending}>
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(trashNode)}
        onOpenChange={(open) => {
          if (!open && !actionPending) {
            setTrashNode(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              {trashNode
                ? `${trashNode.name} will be moved to Trash.`
                : "This item will be moved to Trash."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={actionPending}
              onClick={(event) => {
                event.preventDefault()
                void handleMoveToTrash()
              }}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
