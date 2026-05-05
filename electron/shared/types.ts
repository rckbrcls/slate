export interface SlateFileFilter {
  name: string
  extensions: string[]
}

export interface SlateFileEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

export interface SlateFileStat {
  path: string
  mtimeMs: number | null
  isDirectory: boolean
  isFile: boolean
}

export interface SlateFileWatchEvent {
  watchId: number
  path: string
  eventType: "change" | "rename"
  mtimeMs: number | null
}

export interface ProjectEntry {
  path: string
  name: string
  lastFile: string | null
  lastOpenedAt: string
  favorite: boolean
}

export interface GitFileStatus {
  path: string
  status: "modified" | "added" | "deleted" | "untracked" | "staged"
  staged: boolean
}

export interface GitLogEntry {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}

export interface SlateApi {
  openFileDialog: (options?: {
    filters?: SlateFileFilter[]
  }) => Promise<string | null>
  openDirectoryDialog: () => Promise<string | null>
  saveFileDialog: (options?: {
    filters?: SlateFileFilter[]
    defaultPath?: string
  }) => Promise<string | null>
  readTextFile: (path: string) => Promise<string>
  writeTextFile: (path: string, content: string) => Promise<void>
  writeBinaryFile: (path: string, content: Uint8Array) => Promise<void>
  readDirectory: (path: string) => Promise<SlateFileEntry[]>
  renamePath: (path: string, nextName: string) => Promise<string>
  duplicateFile: (path: string) => Promise<string>
  movePathToTrash: (path: string) => Promise<void>
  revealPath: (path: string) => Promise<void>
  copyPathToClipboard: (path: string) => Promise<void>
  statFile: (path: string) => Promise<SlateFileStat | null>
  watchFile: (
    path: string,
    callback: (event: SlateFileWatchEvent) => void,
  ) => () => void
  projects: {
    read: () => Promise<ProjectEntry[]>
    write: (projects: ProjectEntry[]) => Promise<void>
  }
  git: {
    isRepo: (cwd: string) => Promise<boolean>
    root: (cwd: string) => Promise<string | null>
    status: (cwd: string) => Promise<GitFileStatus[]>
    log: (cwd: string, filePath?: string, limit?: number) => Promise<GitLogEntry[]>
    diff: (cwd: string, filePath?: string) => Promise<string>
    commit: (cwd: string, message: string, files?: string[]) => Promise<boolean>
    checkoutFile: (cwd: string, ref: string, filePath: string) => Promise<boolean>
  }
}
