import { useState, useCallback, useEffect, useRef } from "react"
import { readDir } from "@tauri-apps/plugin-fs"

export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
  expanded?: boolean
}

export interface UseFileExplorerReturn {
  tree: FileNode[]
  projectDir: string | null
  loading: boolean
  toggleFolder: (path: string) => void
  refresh: () => void
}

function deriveProjectDir(filePath: string | null): string | null {
  if (!filePath) return null
  const lastSlash = filePath.lastIndexOf("/")
  return lastSlash > 0 ? filePath.substring(0, lastSlash) : null
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return nodes.sort((a, b) => {
    // Directories first, then alphabetical
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
}

const HIDDEN_ENTRIES = new Set([
  ".git",
  "node_modules",
  ".DS_Store",
  "target",
  ".next",
  "dist",
  "build",
])

export function useFileExplorer(filePath: string | null): UseFileExplorerReturn {
  const [tree, setTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const projectDir = deriveProjectDir(filePath)
  const loadedDirsRef = useRef<Set<string>>(new Set())

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      const entries = await readDir(dirPath)
      const nodes: FileNode[] = entries
        .filter((e) => !HIDDEN_ENTRIES.has(e.name))
        .map((entry) => ({
          name: entry.name,
          path: `${dirPath}/${entry.name}`,
          isDirectory: entry.isDirectory,
          children: entry.isDirectory ? undefined : undefined,
          expanded: false,
        }))
      return sortNodes(nodes)
    } catch {
      return []
    }
  }, [])

  const loadRoot = useCallback(async () => {
    if (!projectDir) {
      setTree([])
      return
    }
    setLoading(true)
    loadedDirsRef.current.clear()
    const nodes = await loadDirectory(projectDir)
    loadedDirsRef.current.add(projectDir)
    setTree(nodes)
    setLoading(false)
  }, [projectDir, loadDirectory])

  // Load root when projectDir changes
  useEffect(() => {
    loadRoot()
  }, [loadRoot])

  const toggleFolder = useCallback(
    async (folderPath: string) => {
      const toggle = async (nodes: FileNode[]): Promise<FileNode[]> => {
        const result: FileNode[] = []
        for (const node of nodes) {
          if (node.path === folderPath && node.isDirectory) {
            const nowExpanded = !node.expanded
            let children = node.children
            if (nowExpanded && !children) {
              children = await loadDirectory(folderPath)
              loadedDirsRef.current.add(folderPath)
            }
            result.push({ ...node, expanded: nowExpanded, children })
          } else if (node.isDirectory && node.children) {
            result.push({ ...node, children: await toggle(node.children) })
          } else {
            result.push(node)
          }
        }
        return result
      }
      setTree((prev) => {
        toggle(prev).then(setTree)
        return prev
      })
    },
    [loadDirectory],
  )

  return {
    tree,
    projectDir,
    loading,
    toggleFolder,
    refresh: loadRoot,
  }
}
