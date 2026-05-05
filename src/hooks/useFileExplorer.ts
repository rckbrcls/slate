import { useState, useCallback, useEffect, useRef } from "react"
import { getPathDir } from "@/lib/slateApi"
import { readDirectory } from "@/lib/fileService"

export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
  expanded?: boolean
}

export interface FilePathReplacement {
  from: string
  to: string
}

export interface UseFileExplorerReturn {
  tree: FileNode[]
  projectDir: string | null
  loading: boolean
  toggleFolder: (path: string) => void
  refresh: (replacement?: FilePathReplacement) => Promise<void>
}

function deriveProjectDir(filePath: string | null): string | null {
  return getPathDir(filePath)
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return nodes.sort((a, b) => {
    // Directories first, then alphabetical
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
}

function replacePathPrefix(path: string, replacement?: FilePathReplacement) {
  if (!replacement) return path
  if (path === replacement.from) return replacement.to
  if (
    path.startsWith(`${replacement.from}/`) ||
    path.startsWith(`${replacement.from}\\`)
  ) {
    return `${replacement.to}${path.slice(replacement.from.length)}`
  }
  return path
}

function collectExpandedPaths(
  nodes: FileNode[],
  replacement?: FilePathReplacement,
  expandedPaths = new Set<string>(),
) {
  for (const node of nodes) {
    if (node.isDirectory && node.expanded) {
      expandedPaths.add(replacePathPrefix(node.path, replacement))
    }

    if (node.children) {
      collectExpandedPaths(node.children, replacement, expandedPaths)
    }
  }

  return expandedPaths
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

export function useFileExplorer(filePath: string | null, explicitProjectDir?: string | null): UseFileExplorerReturn {
  const [tree, setTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const projectDir = explicitProjectDir ?? deriveProjectDir(filePath)
  const loadedDirsRef = useRef<Set<string>>(new Set())
  const treeRef = useRef<FileNode[]>([])

  useEffect(() => {
    treeRef.current = tree
  }, [tree])

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      const entries = await readDirectory(dirPath)
      const nodes: FileNode[] = entries
        .filter((e) => !HIDDEN_ENTRIES.has(e.name))
        .map((entry) => ({
          name: entry.name,
          path: entry.path,
          isDirectory: entry.isDirectory,
          children: entry.isDirectory ? undefined : undefined,
          expanded: false,
        }))
      return sortNodes(nodes)
    } catch {
      return []
    }
  }, [])

  const hydrateExpandedNodes = useCallback(async (
    nodes: FileNode[],
    expandedPaths: Set<string>,
  ): Promise<FileNode[]> => {
    const result: FileNode[] = []

    for (const node of nodes) {
      if (node.isDirectory && expandedPaths.has(node.path)) {
        const children = await hydrateExpandedNodes(
          await loadDirectory(node.path),
          expandedPaths,
        )
        loadedDirsRef.current.add(node.path)
        result.push({ ...node, expanded: true, children })
      } else {
        result.push(node)
      }
    }

    return result
  }, [loadDirectory])

  const loadRoot = useCallback(async (replacement?: FilePathReplacement) => {
    if (!projectDir) {
      setTree([])
      return
    }
    setLoading(true)
    const expandedPaths = collectExpandedPaths(treeRef.current, replacement)
    loadedDirsRef.current.clear()
    const nodes = await hydrateExpandedNodes(
      await loadDirectory(projectDir),
      expandedPaths,
    )
    loadedDirsRef.current.add(projectDir)
    setTree(nodes)
    setLoading(false)
  }, [hydrateExpandedNodes, projectDir, loadDirectory])

  // Load root when projectDir changes
  useEffect(() => {
    void loadRoot()
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
