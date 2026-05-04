import { app, BrowserWindow, dialog, ipcMain, shell, session } from "electron"
import { execFile } from "node:child_process"
import { watch, type FSWatcher } from "node:fs"
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { IPC_CHANNELS } from "../shared/ipc"
import type {
  GitFileStatus,
  GitLogEntry,
  ProjectEntry,
  SlateFileEntry,
  SlateFileFilter,
  SlateFileStat,
  SlateFileWatchEvent,
} from "../shared/types"

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))

interface FileWritePayload {
  path: string
  content: string
}

interface BinaryWritePayload {
  path: string
  content: Uint8Array | number[]
}

interface WatchStartPayload {
  watchId: number
  path: string
}

interface GitLogPayload {
  cwd: string
  filePath?: string
  limit?: number
}

interface GitPathPayload {
  cwd: string
  filePath?: string
}

interface GitCommitPayload {
  cwd: string
  message: string
  files?: string[]
}

interface GitCheckoutPayload {
  cwd: string
  ref: string
  filePath: string
}

interface GitResult {
  stdout: string
  code: number
}

interface ExecFailure extends Error {
  stdout?: string | Buffer
  code?: number
}

const fileWatchers = new Map<number, FSWatcher>()

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${field}`)
  }
  return value
}

function assertStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid ${field}`)
  }
  return value
}

function normalizeFilters(value: unknown): SlateFileFilter[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throw new Error("Invalid dialog filters")
  }

  return value.map((filter: unknown) => {
    if (
      !filter ||
      typeof filter !== "object" ||
      !("name" in filter) ||
      typeof filter.name !== "string" ||
      !("extensions" in filter) ||
      !Array.isArray(filter.extensions) ||
      filter.extensions.some((extension: unknown) => typeof extension !== "string")
    ) {
      throw new Error("Invalid dialog filter")
    }

    return {
      name: filter.name,
      extensions: filter.extensions,
    }
  })
}

function toFileStat(filePath: string, stats: Awaited<ReturnType<typeof stat>>): SlateFileStat {
  const mtimeMs =
    typeof stats.mtimeMs === "bigint" ? Number(stats.mtimeMs) : stats.mtimeMs

  return {
    path: filePath,
    mtimeMs: Number.isFinite(mtimeMs) ? mtimeMs : null,
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
  }
}

async function statFile(filePath: string): Promise<SlateFileStat | null> {
  try {
    const stats = await stat(filePath)
    return toFileStat(filePath, stats)
  } catch {
    return null
  }
}

function projectStoreFilePath() {
  return join(app.getPath("userData"), "slate-projects.json")
}

function isProjectEntry(value: unknown): value is ProjectEntry {
  if (!value || typeof value !== "object") return false

  return (
    "path" in value &&
    typeof value.path === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "lastOpenedAt" in value &&
    typeof value.lastOpenedAt === "string" &&
    "favorite" in value &&
    typeof value.favorite === "boolean" &&
    (!("lastFile" in value) || typeof value.lastFile === "string" || value.lastFile === null)
  )
}

async function readProjects(): Promise<ProjectEntry[]> {
  try {
    const raw = await readFile(projectStoreFilePath(), "utf8")
    const parsed = JSON.parse(raw) as unknown
    const projects = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "projects" in parsed
        ? parsed.projects
        : []

    return Array.isArray(projects) ? projects.filter(isProjectEntry) : []
  } catch {
    return []
  }
}

async function writeProjects(projects: ProjectEntry[]) {
  await mkdir(dirname(projectStoreFilePath()), { recursive: true })
  await writeFile(
    projectStoreFilePath(),
    `${JSON.stringify({ projects }, null, 2)}\n`,
    "utf8",
  )
}

async function runGit(cwd: string, args: string[]): Promise<GitResult> {
  assertString(cwd, "cwd")
  await stat(cwd)

  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 15000,
      windowsHide: true,
    })

    return {
      stdout: String(stdout).trim(),
      code: 0,
    }
  } catch (error) {
    const execError = error as ExecFailure
    return {
      stdout: String(execError.stdout ?? "").trim(),
      code: typeof execError.code === "number" ? execError.code : 1,
    }
  }
}

function parseGitStatus(stdout: string): GitFileStatus[] {
  if (!stdout) return []

  return stdout.split("\n").map((line) => {
    const indexStatus = line[0]
    const workTreeStatus = line[1]
    const filePath = line.substring(3)

    let statusValue: GitFileStatus["status"] = "modified"
    let staged = false

    if (indexStatus === "?" && workTreeStatus === "?") {
      statusValue = "untracked"
    } else if (indexStatus === "A") {
      statusValue = "added"
      staged = true
    } else if (indexStatus === "D" || workTreeStatus === "D") {
      statusValue = "deleted"
      staged = indexStatus === "D"
    } else if (indexStatus === "M" || indexStatus === "R") {
      statusValue = "staged"
      staged = true
    } else if (workTreeStatus === "M") {
      statusValue = "modified"
    }

    return { path: filePath, status: statusValue, staged }
  })
}

function parseGitLog(stdout: string): GitLogEntry[] {
  if (!stdout) return []

  return stdout.split("\n").map((line) => {
    const [hash = "", shortHash = "", message = "", author = "", date = ""] =
      line.split("|")

    return { hash, shortHash, message, author, date }
  })
}

function installSecurityDefaults() {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const devPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:* ws://localhost:*",
    ].join("; ")

    const productionPolicy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
    ].join("; ")

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [app.isPackaged ? productionPolicy : devPolicy],
      },
    })
  })
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Slate",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url)
    }

    return { action: "deny" }
  })

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const currentUrl = mainWindow.webContents.getURL()
    if (url !== currentUrl) {
      event.preventDefault()
    }
  })

  mainWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error(`Slate failed to load ${url}: ${code} ${description}`)
  })

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`Slate renderer process exited: ${details.reason}`)
  })

  mainWindow.webContents.on("console-message", (details) => {
    if (details.level === "warning" || details.level === "error") {
      console.error(`Slate renderer: ${details.message}`)
    }
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL).catch((error: unknown) => {
      console.error("Slate failed to load the development renderer", error)
    })
    return
  }

  void mainWindow.loadFile(join(__dirname, "../renderer/index.html")).catch((error: unknown) => {
    console.error("Slate failed to load the packaged renderer", error)
  })
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.dialogOpenFile, async (_event, options: unknown) => {
    const filters = normalizeFilters(
      options && typeof options === "object" && "filters" in options
        ? options.filters
        : undefined,
    )
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters,
    })

    return result.canceled ? null : result.filePaths[0] ?? null
  })

  ipcMain.handle(IPC_CHANNELS.dialogOpenDirectory, async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    })

    return result.canceled ? null : result.filePaths[0] ?? null
  })

  ipcMain.handle(IPC_CHANNELS.dialogSaveFile, async (_event, options: unknown) => {
    const filters = normalizeFilters(
      options && typeof options === "object" && "filters" in options
        ? options.filters
        : undefined,
    )
    const defaultPath =
      options && typeof options === "object" && "defaultPath" in options
        ? assertString(options.defaultPath, "defaultPath")
        : undefined

    const result = await dialog.showSaveDialog({
      filters,
      defaultPath,
    })

    return result.canceled ? null : result.filePath ?? null
  })

  ipcMain.handle(IPC_CHANNELS.fileReadText, async (_event, filePath: unknown) => {
    return readFile(assertString(filePath, "path"), "utf8")
  })

  ipcMain.handle(IPC_CHANNELS.fileWriteText, async (_event, payload: FileWritePayload) => {
    await writeFile(assertString(payload.path, "path"), payload.content, "utf8")
  })

  ipcMain.handle(IPC_CHANNELS.fileWriteBinary, async (_event, payload: BinaryWritePayload) => {
    await writeFile(
      assertString(payload.path, "path"),
      Buffer.from(payload.content),
    )
  })

  ipcMain.handle(IPC_CHANNELS.fileReadDirectory, async (_event, dirPath: unknown) => {
    const root = assertString(dirPath, "path")
    const entries = await readdir(root, { withFileTypes: true })

    return entries.map<SlateFileEntry>((entry) => ({
      name: entry.name,
      path: join(root, entry.name),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }))
  })

  ipcMain.handle(IPC_CHANNELS.fileStat, async (_event, filePath: unknown) => {
    return statFile(assertString(filePath, "path"))
  })

  ipcMain.handle(IPC_CHANNELS.fileWatchStart, async (event, payload: WatchStartPayload) => {
    if (typeof payload.watchId !== "number") {
      throw new Error("Invalid watchId")
    }

    const filePath = assertString(payload.path, "path")
    fileWatchers.get(payload.watchId)?.close()

    const watcher = watch(filePath, { persistent: false }, async (eventType) => {
      const fileStat = await statFile(filePath)
      const message: SlateFileWatchEvent = {
        watchId: payload.watchId,
        path: filePath,
        eventType: eventType === "rename" ? "rename" : "change",
        mtimeMs: fileStat?.mtimeMs ?? null,
      }

      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_CHANNELS.fileWatchEvent, message)
      }
    })

    fileWatchers.set(payload.watchId, watcher)
    event.sender.once("destroyed", () => {
      fileWatchers.get(payload.watchId)?.close()
      fileWatchers.delete(payload.watchId)
    })
  })

  ipcMain.handle(IPC_CHANNELS.fileWatchStop, (_event, watchId: unknown) => {
    if (typeof watchId !== "number") return
    fileWatchers.get(watchId)?.close()
    fileWatchers.delete(watchId)
  })

  ipcMain.handle(IPC_CHANNELS.projectsRead, readProjects)

  ipcMain.handle(IPC_CHANNELS.projectsWrite, async (_event, projects: unknown) => {
    if (!Array.isArray(projects) || projects.some((project) => !isProjectEntry(project))) {
      throw new Error("Invalid projects payload")
    }

    await writeProjects(projects)
  })

  ipcMain.handle(IPC_CHANNELS.gitIsRepo, async (_event, cwd: unknown) => {
    const result = await runGit(assertString(cwd, "cwd"), [
      "rev-parse",
      "--is-inside-work-tree",
    ])

    return result.code === 0 && result.stdout === "true"
  })

  ipcMain.handle(IPC_CHANNELS.gitRoot, async (_event, cwd: unknown) => {
    const result = await runGit(assertString(cwd, "cwd"), [
      "rev-parse",
      "--show-toplevel",
    ])

    return result.code === 0 ? result.stdout : null
  })

  ipcMain.handle(IPC_CHANNELS.gitStatus, async (_event, cwd: unknown) => {
    const result = await runGit(assertString(cwd, "cwd"), ["status", "--porcelain"])
    return result.code === 0 ? parseGitStatus(result.stdout) : []
  })

  ipcMain.handle(IPC_CHANNELS.gitLog, async (_event, payload: GitLogPayload) => {
    const cwd = assertString(payload.cwd, "cwd")
    const args = [
      "log",
      "--format=%H|%h|%s|%an|%aI",
      "-n",
      String(typeof payload.limit === "number" ? payload.limit : 20),
    ]

    if (payload.filePath) {
      args.push("--", assertString(payload.filePath, "filePath"))
    }

    const result = await runGit(cwd, args)
    return result.code === 0 ? parseGitLog(result.stdout) : []
  })

  ipcMain.handle(IPC_CHANNELS.gitDiff, async (_event, payload: GitPathPayload) => {
    const args = ["diff", "HEAD"]

    if (payload.filePath) {
      args.push("--", assertString(payload.filePath, "filePath"))
    }

    const result = await runGit(assertString(payload.cwd, "cwd"), args)
    return result.code === 0 ? result.stdout : ""
  })

  ipcMain.handle(IPC_CHANNELS.gitCommit, async (_event, payload: GitCommitPayload) => {
    const cwd = assertString(payload.cwd, "cwd")
    const message = assertString(payload.message, "message")
    const files = assertStringArray(payload.files, "files")

    if (files && files.length > 0) {
      await runGit(cwd, ["add", ...files])
    } else {
      await runGit(cwd, ["add", "-A"])
    }

    const result = await runGit(cwd, ["commit", "-m", message])
    return result.code === 0
  })

  ipcMain.handle(IPC_CHANNELS.gitCheckoutFile, async (_event, payload: GitCheckoutPayload) => {
    const result = await runGit(assertString(payload.cwd, "cwd"), [
      "checkout",
      assertString(payload.ref, "ref"),
      "--",
      assertString(payload.filePath, "filePath"),
    ])

    return result.code === 0
  })
}

app.whenReady().then(() => {
  installSecurityDefaults()
  registerIpcHandlers()
  createMainWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
