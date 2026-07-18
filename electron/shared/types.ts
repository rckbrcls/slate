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

export type AnalysisPackId = string

export interface IntelligenceProject {
  id: string
  name: string
  path: string
  analysisPack: AnalysisPackId
  createdAt: string
  updatedAt: string
  versionCount: number
}

export interface DocumentVersion {
  id: string
  ordinal: number
  sourceName: string
  sourceFormat: string
  contentHash: string
  importedAt: string
  note: string | null
}

export interface BoundingBox {
  left: number
  top: number
  right: number
  bottom: number
}

export interface DocumentElement {
  id: string
  kind: string
  text: string
  charStart: number
  charEnd: number
  page: number | null
  boundingBox: BoundingBox | null
}

export interface NormalizedDocument {
  schemaVersion: "1.0.0"
  parserVersion: string
  metadata: {
    sourceName: string
    sourceFormat: string
    contentHash: string
    title: string | null
    author: string | null
  }
  text: string
  pages: Array<{ number: number; width: number | null; height: number | null }>
  sections: Array<{ id: string; title: string; level: number; elementIds: string[] }>
  elements: DocumentElement[]
  provenance: Array<{
    elementId: string
    source: string
    page: number | null
    boundingBox: BoundingBox | null
  }>
}

export interface MetricResult {
  key: string
  label: string
  value: number | string | unknown[] | Record<string, unknown>
  kind: "number" | "percentage" | "text" | "list" | "distribution"
  unit: string | null
  description: string
}

export interface AnalysisFinding {
  key: string
  title: string
  description: string
  severity: "info" | "warning" | "error"
  criterion: string
  elementIds: string[]
}

export interface AnalysisRun {
  runId: string
  versionId: string
  packId: AnalysisPackId
  algorithmVersion: string
  startedAt: string
  completedAt: string
  durationMs: number
  metrics: MetricResult[]
  findings: AnalysisFinding[]
}

export interface VersionComparison {
  id: string
  baseVersionId: string
  targetVersionId: string
  createdAt: string
  packId: string
  summary: { added: number; removed: number; changed: number; moved: number; unchanged: number }
  changes: Array<{
    status: "added" | "removed" | "changed" | "moved"
    baseElementIds: string[]
    targetElementIds: string[]
    baseText: string
    targetText: string
  }>
  metricDeltas: Array<{
    key: string
    label: string
    baseValue: unknown
    targetValue: unknown
    delta: number | null
    unit: string | null
  }>
  findingStates: Array<{
    key: string
    status: "new" | "persistent" | "resolved" | "regressed"
  }>
  unmatchedAnnotations: string[]
}

export interface AnalysisProgress {
  requestId: string
  stage: "normalizing" | "analyzing" | "ready"
  percent: number
  message: string
}

export interface IntelligenceApi {
  createProject: (input: {
    path: string
    name: string
    analysisPack: AnalysisPackId
  }) => Promise<IntelligenceProject>
  openProject: (path: string) => Promise<IntelligenceProject>
  setAnalysisPack: (projectPath: string, analysisPack: AnalysisPackId) => Promise<IntelligenceProject>
  importVersion: (input: {
    requestId: string
    projectPath: string
    sourcePath: string
    note?: string
  }) => Promise<{ version: DocumentVersion; analysis: AnalysisRun }>
  listVersions: (projectPath: string) => Promise<DocumentVersion[]>
  getDocument: (projectPath: string, versionId: string) => Promise<NormalizedDocument>
  getDocumentAsset: (projectPath: string, versionId: string) => Promise<Uint8Array>
  getAnalysis: (
    projectPath: string,
    versionId: string,
    analysisPack: AnalysisPackId,
  ) => Promise<AnalysisRun>
  compareVersions: (
    projectPath: string,
    baseVersionId: string,
    targetVersionId: string,
  ) => Promise<VersionComparison>
  cancel: (requestId: string) => void
  onProgress: (callback: (progress: AnalysisProgress) => void) => () => void
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
  intelligence: IntelligenceApi
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
