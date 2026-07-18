import { contextBridge, ipcRenderer } from "electron"
import { IPC_CHANNELS } from "../shared/ipc"
import type {
  GitFileStatus,
  GitLogEntry,
  AnalysisProgress,
  ProjectEntry,
  SlateApi,
  SlateFileEntry,
  SlateFileFilter,
  SlateFileStat,
  SlateFileWatchEvent,
} from "../shared/types"

let nextWatchId = 1

const slateApi: SlateApi = {
  openFileDialog: (options?: { filters?: SlateFileFilter[] }) =>
    ipcRenderer.invoke(IPC_CHANNELS.dialogOpenFile, options) as Promise<string | null>,

  openDirectoryDialog: () =>
    ipcRenderer.invoke(IPC_CHANNELS.dialogOpenDirectory) as Promise<string | null>,

  saveFileDialog: (options?: {
    filters?: SlateFileFilter[]
    defaultPath?: string
  }) => ipcRenderer.invoke(IPC_CHANNELS.dialogSaveFile, options) as Promise<string | null>,

  readTextFile: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileReadText, path) as Promise<string>,

  writeTextFile: (path: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileWriteText, { path, content }) as Promise<void>,

  writeBinaryFile: (path: string, content: Uint8Array) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileWriteBinary, { path, content }) as Promise<void>,

  readDirectory: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileReadDirectory, path) as Promise<SlateFileEntry[]>,

  renamePath: (path: string, nextName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileRenamePath, { path, nextName }) as Promise<string>,

  duplicateFile: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileDuplicate, path) as Promise<string>,

  movePathToTrash: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileMoveToTrash, path) as Promise<void>,

  revealPath: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileReveal, path) as Promise<void>,

  copyPathToClipboard: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileCopyPathToClipboard, path) as Promise<void>,

  statFile: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileStat, path) as Promise<SlateFileStat | null>,

  watchFile: (path: string, callback: (event: SlateFileWatchEvent) => void) => {
    const watchId = nextWatchId
    nextWatchId += 1

    const listener = (_event: Electron.IpcRendererEvent, payload: SlateFileWatchEvent) => {
      if (payload.watchId === watchId) {
        callback(payload)
      }
    }

    ipcRenderer.on(IPC_CHANNELS.fileWatchEvent, listener)
    void ipcRenderer.invoke(IPC_CHANNELS.fileWatchStart, { watchId, path })

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.fileWatchEvent, listener)
      void ipcRenderer.invoke(IPC_CHANNELS.fileWatchStop, watchId)
    }
  },

  projects: {
    read: () =>
      ipcRenderer.invoke(IPC_CHANNELS.projectsRead) as Promise<ProjectEntry[]>,
    write: (projects: ProjectEntry[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.projectsWrite, projects) as Promise<void>,
  },

  intelligence: {
    createProject: (input) =>
      ipcRenderer.invoke(IPC_CHANNELS.intelligenceCreateProject, input),
    openProject: (path) =>
      ipcRenderer.invoke(IPC_CHANNELS.intelligenceOpenProject, path),
    setAnalysisPack: (projectPath, analysisPack) =>
      ipcRenderer.invoke(IPC_CHANNELS.intelligenceSetAnalysisPack, {
        projectPath,
        analysisPack,
      }),
    importVersion: (input) =>
      ipcRenderer.invoke(IPC_CHANNELS.intelligenceImportVersion, input),
    listVersions: (projectPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.intelligenceListVersions, projectPath),
    getDocument: (projectPath, versionId) =>
      ipcRenderer.invoke(IPC_CHANNELS.intelligenceGetDocument, {
        projectPath,
        versionId,
      }),
    getDocumentAsset: (projectPath, versionId) =>
      ipcRenderer.invoke(IPC_CHANNELS.intelligenceGetDocumentAsset, {
        projectPath,
        versionId,
      }),
    getAnalysis: (projectPath, versionId, analysisPack) =>
      ipcRenderer.invoke(IPC_CHANNELS.intelligenceGetAnalysis, {
        projectPath,
        versionId,
        analysisPack,
      }),
    compareVersions: (projectPath, baseVersionId, targetVersionId) =>
      ipcRenderer.invoke(IPC_CHANNELS.intelligenceCompareVersions, {
        projectPath,
        baseVersionId,
        targetVersionId,
      }),
    cancel: (requestId) => {
      ipcRenderer.send(IPC_CHANNELS.intelligenceCancel, requestId)
    },
    onProgress: (callback: (progress: AnalysisProgress) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: AnalysisProgress) => {
        callback(progress)
      }
      ipcRenderer.on(IPC_CHANNELS.intelligenceProgress, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.intelligenceProgress, listener)
    },
  },

  git: {
    isRepo: (cwd: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.gitIsRepo, cwd) as Promise<boolean>,
    root: (cwd: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.gitRoot, cwd) as Promise<string | null>,
    status: (cwd: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.gitStatus, cwd) as Promise<GitFileStatus[]>,
    log: (cwd: string, filePath?: string, limit?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.gitLog, { cwd, filePath, limit }) as Promise<GitLogEntry[]>,
    diff: (cwd: string, filePath?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.gitDiff, { cwd, filePath }) as Promise<string>,
    commit: (cwd: string, message: string, files?: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.gitCommit, { cwd, message, files }) as Promise<boolean>,
    checkoutFile: (cwd: string, ref: string, filePath: string) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.gitCheckoutFile,
        { cwd, ref, filePath },
      ) as Promise<boolean>,
  },
}

contextBridge.exposeInMainWorld("slate", slateApi)
