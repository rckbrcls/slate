import { memo, useCallback } from "react"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  FileCode,
  File,
} from "lucide-react"
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
}

const FOUNTAIN_EXTS = new Set(["fountain", "spmd"])

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (FOUNTAIN_EXTS.has(ext)) return <FileCode className="size-4 text-amber-400 shrink-0" />
  if (ext === "pdf") return <FileText className="size-4 text-red-400 shrink-0" />
  if (ext === "fdx") return <FileText className="size-4 text-blue-400 shrink-0" />
  return <File className="size-4 text-muted-foreground shrink-0" />
}

function getGitBadge(filePath: string, gitStatus?: GitFileStatus[]) {
  if (!gitStatus) return null
  const entry = gitStatus.find((s) => filePath.endsWith(s.path))
  if (!entry) return null

  const badges: Record<string, { label: string; className: string }> = {
    modified: { label: "M", className: "text-orange-400" },
    added: { label: "A", className: "text-green-400" },
    deleted: { label: "D", className: "text-red-400" },
    untracked: { label: "?", className: "text-muted-foreground" },
    staged: { label: "S", className: "text-green-400" },
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
}: {
  node: FileNode
  depth: number
  onToggleFolder: (path: string) => void
  onOpenFile: (path: string) => void
  currentFilePath: string | null
  gitStatus?: GitFileStatus[]
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
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-1.5 py-1 pr-2 text-xs hover:bg-muted/50 transition-colors ${
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
            <Folder className={`size-4 shrink-0 ${node.expanded ? "text-amber-400" : "text-muted-foreground"}`} />
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

      {node.isDirectory && node.expanded && node.children?.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          onToggleFolder={onToggleFolder}
          onOpenFile={onOpenFile}
          currentFilePath={currentFilePath}
          gitStatus={gitStatus}
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
}: FileExplorerProps) {
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
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-xs font-medium truncate text-muted-foreground uppercase tracking-wider">
          {dirName}
        </h3>
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
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
