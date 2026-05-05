import type {
  GitFileStatus,
  GitLogEntry,
  ProjectEntry,
  SlateApi,
  SlateFileEntry,
  SlateFileStat,
} from "../../electron/shared/types"

const PROJECTS_STORAGE_KEY = "slate-mock-projects"
const MOCK_ROOT = "/mock/slate"
const MOCK_OPEN_DIRECTORY = `${MOCK_ROOT}/showcase-room`

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function createEntry(path: string, isDirectory: boolean): SlateFileEntry {
  return {
    name: path.split("/").pop() ?? path,
    path,
    isDirectory,
    isFile: !isDirectory,
  }
}

const defaultProjects: ProjectEntry[] = [
  {
    path: `${MOCK_ROOT}/blackout-at-noon`,
    name: "Blackout at Noon",
    lastFile: `${MOCK_ROOT}/blackout-at-noon/blackout-at-noon.fountain`,
    lastOpenedAt: daysAgo(1),
    favorite: true,
  },
  {
    path: `${MOCK_ROOT}/station-eleven`,
    name: "Station Eleven Rewrite",
    lastFile: `${MOCK_ROOT}/station-eleven/pilot.fountain`,
    lastOpenedAt: daysAgo(4),
    favorite: false,
  },
  {
    path: `${MOCK_ROOT}/coastal-room`,
    name: "Coastal Room",
    lastFile: `${MOCK_ROOT}/coastal-room/table-read.fountain`,
    lastOpenedAt: daysAgo(9),
    favorite: false,
  },
]

const mockTextFiles = new Map<string, string>([
  [
    `${MOCK_ROOT}/blackout-at-noon/blackout-at-noon.fountain`,
    `Title: Blackout at Noon
Credit: Written by
Author: Slate Mock Room

INT. OBSERVATORY - DAY

The power dies at noon. Dust floats through a shaft of white light.

MARA
Nobody touches the doors until we know what changed.

JONAH
That is exactly when people start touching doors.
`,
  ],
  [
    `${MOCK_ROOT}/station-eleven/pilot.fountain`,
    `Title: Station Eleven Rewrite

EXT. TRAIN PLATFORM - NIGHT

Rain hammers the glass roof. A delayed train glows at the edge of the city.

ELI
We are not late. The schedule is lying.
`,
  ],
  [
    `${MOCK_ROOT}/coastal-room/table-read.fountain`,
    `Title: Coastal Room

INT. BEACH HOUSE - MORNING

Pages cover the breakfast table. Coffee cups mark every alternate ending.

NORA
Read the quiet version first.
`,
  ],
  [
    `${MOCK_OPEN_DIRECTORY}/opening-shot.fountain`,
    `Title: Showcase Room

INT. WRITERS ROOM - AFTERNOON

A corkboard holds cards for scenes that do not exist yet.

ASSISTANT
The mock is live. We can move pieces without touching the real filesystem.
`,
  ],
  [
    `${MOCK_OPEN_DIRECTORY}/notes/character-pass.fountain`,
    `INT. HALLWAY - NIGHT

Every character gets one secret and one bad habit.
`,
  ],
])

const mockDirectories = new Map<string, SlateFileEntry[]>([
  [
    `${MOCK_ROOT}/blackout-at-noon`,
    [
      createEntry(`${MOCK_ROOT}/blackout-at-noon/blackout-at-noon.fountain`, false),
      createEntry(`${MOCK_ROOT}/blackout-at-noon/outline.md`, false),
      createEntry(`${MOCK_ROOT}/blackout-at-noon/drafts`, true),
    ],
  ],
  [
    `${MOCK_ROOT}/blackout-at-noon/drafts`,
    [
      createEntry(`${MOCK_ROOT}/blackout-at-noon/drafts/act-two.fountain`, false),
      createEntry(`${MOCK_ROOT}/blackout-at-noon/drafts/cold-open.fountain`, false),
    ],
  ],
  [
    `${MOCK_ROOT}/station-eleven`,
    [
      createEntry(`${MOCK_ROOT}/station-eleven/pilot.fountain`, false),
      createEntry(`${MOCK_ROOT}/station-eleven/revisions`, true),
    ],
  ],
  [
    `${MOCK_ROOT}/station-eleven/revisions`,
    [createEntry(`${MOCK_ROOT}/station-eleven/revisions/blue-pages.fountain`, false)],
  ],
  [
    `${MOCK_ROOT}/coastal-room`,
    [
      createEntry(`${MOCK_ROOT}/coastal-room/table-read.fountain`, false),
      createEntry(`${MOCK_ROOT}/coastal-room/export.pdf`, false),
    ],
  ],
  [
    MOCK_OPEN_DIRECTORY,
    [
      createEntry(`${MOCK_OPEN_DIRECTORY}/opening-shot.fountain`, false),
      createEntry(`${MOCK_OPEN_DIRECTORY}/notes`, true),
      createEntry(`${MOCK_OPEN_DIRECTORY}/exports`, true),
    ],
  ],
  [
    `${MOCK_OPEN_DIRECTORY}/notes`,
    [createEntry(`${MOCK_OPEN_DIRECTORY}/notes/character-pass.fountain`, false)],
  ],
  [`${MOCK_OPEN_DIRECTORY}/exports`, []],
])

const mockGitStatus: GitFileStatus[] = [
  {
    path: "opening-shot.fountain",
    status: "modified",
    staged: false,
  },
  {
    path: "notes/character-pass.fountain",
    status: "untracked",
    staged: false,
  },
]

const mockGitLog: GitLogEntry[] = [
  {
    hash: "9f1c4e4e7b6d",
    shortHash: "9f1c4e4",
    message: "Shape opening sequence",
    author: "Slate Mock",
    date: daysAgo(1),
  },
  {
    hash: "54a7d2ce91bb",
    shortHash: "54a7d2c",
    message: "Add character pass notes",
    author: "Slate Mock",
    date: daysAgo(3),
  },
]

function cloneProject(project: ProjectEntry): ProjectEntry {
  return { ...project }
}

function cloneProjects(projects: ProjectEntry[]) {
  return projects.map(cloneProject)
}

function getBrowserSessionStorage() {
  if (typeof window === "undefined") return null

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function readStoredProjects(storage: Storage | null) {
  if (!storage) return null

  try {
    const raw = storage.getItem(PROJECTS_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null

    return parsed.filter((item): item is ProjectEntry => (
      Boolean(item) &&
      typeof item === "object" &&
      "path" in item &&
      typeof item.path === "string" &&
      "name" in item &&
      typeof item.name === "string" &&
      "lastOpenedAt" in item &&
      typeof item.lastOpenedAt === "string" &&
      "favorite" in item &&
      typeof item.favorite === "boolean" &&
      (
        !("lastFile" in item) ||
        typeof item.lastFile === "string" ||
        item.lastFile === null
      )
    ))
  } catch {
    return null
  }
}

function writeStoredProjects(storage: Storage | null, projects: ProjectEntry[]) {
  if (!storage) return

  try {
    storage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // The mock should stay usable even when browser storage is unavailable.
  }
}

function cloneDirectories() {
  return new Map(
    [...mockDirectories.entries()].map(([path, entries]) => [
      path,
      entries.map((entry) => ({ ...entry })),
    ]),
  )
}

function getMockPathName(path: string) {
  return path.split("/").pop() || path
}

function getMockPathDir(path: string) {
  const index = path.lastIndexOf("/")
  return index > 0 ? path.substring(0, index) : null
}

function replaceMockPathPrefix(path: string, oldPath: string, newPath: string) {
  return path === oldPath ? newPath : path.replace(`${oldPath}/`, `${newPath}/`)
}

function isMockPathInside(path: string, dirPath: string) {
  return path === dirPath || path.startsWith(`${dirPath}/`)
}

function assertMockFileName(value: string) {
  const name = value.trim()

  if (name.length === 0 || name.includes("/") || name.includes("\\")) {
    throw new Error("Invalid file name")
  }

  return name
}

function hasMockPath(
  path: string,
  textFiles: Map<string, string>,
  directories: Map<string, SlateFileEntry[]>,
) {
  return textFiles.has(path) || directories.has(path)
}

function removeDirectoryEntry(
  directories: Map<string, SlateFileEntry[]>,
  path: string,
) {
  const parentDir = getMockPathDir(path)
  if (!parentDir) return

  const entries = directories.get(parentDir)
  if (!entries) return

  directories.set(parentDir, entries.filter((entry) => entry.path !== path))
}

function upsertDirectoryEntry(
  directories: Map<string, SlateFileEntry[]>,
  path: string,
  isDirectory: boolean,
) {
  const parentDir = getMockPathDir(path)
  if (!parentDir) return

  const entries = directories.get(parentDir)
  if (!entries) return

  const entry = createEntry(path, isDirectory)
  const existingIndex = entries.findIndex((item) => item.path === path)

  if (existingIndex >= 0) {
    directories.set(parentDir, entries.map((item, index) => (
      index === existingIndex ? entry : item
    )))
    return
  }

  directories.set(parentDir, [...entries, entry])
}

function getMockDuplicatePath(
  path: string,
  textFiles: Map<string, string>,
  directories: Map<string, SlateFileEntry[]>,
) {
  const parentDir = getMockPathDir(path)
  if (!parentDir) throw new Error("Invalid file path")

  const fileName = getMockPathName(path)
  const extensionIndex = fileName.lastIndexOf(".")
  const stem = extensionIndex > 0 ? fileName.substring(0, extensionIndex) : fileName
  const extension = extensionIndex > 0 ? fileName.substring(extensionIndex) : ""

  for (let index = 1; index < 1000; index += 1) {
    const suffix = index === 1 ? " copy" : ` copy ${index}`
    const candidate = `${parentDir}/${stem}${suffix}${extension}`

    if (!hasMockPath(candidate, textFiles, directories)) {
      return candidate
    }
  }

  throw new Error("Could not find an available copy name")
}

function createFileStat(
  path: string,
  textFiles: Map<string, string>,
  directories: Map<string, SlateFileEntry[]>,
): SlateFileStat | null {
  const isDirectory = directories.has(path)
  const isFile = textFiles.has(path)

  if (!isDirectory && !isFile) return null

  return {
    path,
    mtimeMs: Date.now(),
    isDirectory,
    isFile,
  }
}

export function createMockSlateApi({
  storage = getBrowserSessionStorage(),
}: {
  storage?: Storage | null
} = {}): SlateApi {
  let projects = cloneProjects(readStoredProjects(storage) ?? defaultProjects)
  const textFiles = new Map(mockTextFiles)
  const directories = cloneDirectories()
  let clipboardText = ""

  const persistProjects = (nextProjects: ProjectEntry[]) => {
    projects = cloneProjects(nextProjects)
    writeStoredProjects(storage, projects)
  }

  return {
    openFileDialog: async () => `${MOCK_OPEN_DIRECTORY}/opening-shot.fountain`,
    openDirectoryDialog: async () => MOCK_OPEN_DIRECTORY,
    saveFileDialog: async (options) => (
      `${MOCK_OPEN_DIRECTORY}/${options?.defaultPath ?? "untitled.fountain"}`
    ),
    readTextFile: async (path) => textFiles.get(path) ?? "",
    writeTextFile: async (path, content) => {
      textFiles.set(path, content)
      upsertDirectoryEntry(directories, path, false)
    },
    writeBinaryFile: async () => undefined,
    readDirectory: async (path) => (
      directories.get(path)?.map((entry) => ({ ...entry })) ?? []
    ),
    renamePath: async (path, nextName) => {
      const cleanName = assertMockFileName(nextName)
      const parentDir = getMockPathDir(path)
      if (!parentDir) throw new Error("Invalid file path")

      const nextPath = `${parentDir}/${cleanName}`
      if (nextPath === path) return path

      const isFile = textFiles.has(path)
      const isDirectory = directories.has(path)
      if (!isFile && !isDirectory) throw new Error("File or folder not found")
      if (hasMockPath(nextPath, textFiles, directories)) {
        throw new Error("A file or folder with that name already exists")
      }

      removeDirectoryEntry(directories, path)

      if (isFile) {
        const content = textFiles.get(path) ?? ""
        textFiles.delete(path)
        textFiles.set(nextPath, content)
        upsertDirectoryEntry(directories, nextPath, false)
        return nextPath
      }

      const nextDirectories = new Map<string, SlateFileEntry[]>()
      for (const [dirPath, entries] of directories.entries()) {
        const renamedDirPath = isMockPathInside(dirPath, path)
          ? replaceMockPathPrefix(dirPath, path, nextPath)
          : dirPath
        const renamedEntries = entries.map((entry) => {
          if (!isMockPathInside(entry.path, path)) return { ...entry }

          const renamedPath = replaceMockPathPrefix(entry.path, path, nextPath)
          return {
            ...entry,
            name: getMockPathName(renamedPath),
            path: renamedPath,
          }
        })
        nextDirectories.set(renamedDirPath, renamedEntries)
      }

      directories.clear()
      for (const [dirPath, entries] of nextDirectories.entries()) {
        directories.set(dirPath, entries)
      }

      for (const [filePath, content] of [...textFiles.entries()]) {
        if (!isMockPathInside(filePath, path)) continue

        textFiles.delete(filePath)
        textFiles.set(replaceMockPathPrefix(filePath, path, nextPath), content)
      }

      upsertDirectoryEntry(directories, nextPath, true)
      return nextPath
    },
    duplicateFile: async (path) => {
      if (!textFiles.has(path)) {
        throw new Error("Only files can be duplicated")
      }

      const copiedPath = getMockDuplicatePath(path, textFiles, directories)
      textFiles.set(copiedPath, textFiles.get(path) ?? "")
      upsertDirectoryEntry(directories, copiedPath, false)
      return copiedPath
    },
    movePathToTrash: async (path) => {
      const isFile = textFiles.has(path)
      const isDirectory = directories.has(path)
      if (!isFile && !isDirectory) throw new Error("File or folder not found")

      removeDirectoryEntry(directories, path)

      if (isFile) {
        textFiles.delete(path)
        return
      }

      for (const dirPath of [...directories.keys()]) {
        if (isMockPathInside(dirPath, path)) {
          directories.delete(dirPath)
        }
      }

      for (const filePath of [...textFiles.keys()]) {
        if (isMockPathInside(filePath, path)) {
          textFiles.delete(filePath)
        }
      }
    },
    revealPath: async (path) => {
      if (!hasMockPath(path, textFiles, directories)) {
        throw new Error("File or folder not found")
      }
    },
    copyPathToClipboard: async (path) => {
      if (!hasMockPath(path, textFiles, directories)) {
        throw new Error("File or folder not found")
      }

      clipboardText = path
      void clipboardText
    },
    statFile: async (path) => createFileStat(path, textFiles, directories),
    watchFile: () => () => undefined,
    projects: {
      read: async () => cloneProjects(projects),
      write: async (nextProjects) => {
        persistProjects(nextProjects)
      },
    },
    git: {
      isRepo: async (cwd) => cwd.startsWith(MOCK_ROOT),
      root: async (cwd) => (cwd.startsWith(MOCK_ROOT) ? cwd : null),
      status: async () => mockGitStatus.map((entry) => ({ ...entry })),
      log: async () => mockGitLog.map((entry) => ({ ...entry })),
      diff: async (_cwd, filePath) => (
        `diff --git a/${filePath ?? "opening-shot.fountain"} b/${filePath ?? "opening-shot.fountain"}
--- a/${filePath ?? "opening-shot.fountain"}
+++ b/${filePath ?? "opening-shot.fountain"}
@@ -1,3 +1,4 @@
 INT. WRITERS ROOM - AFTERNOON
+A fresh card lands on the board.
`
      ),
      commit: async () => true,
      checkoutFile: async () => true,
    },
  }
}

let mockSlateApi: SlateApi | null = null

export function getMockSlateApi() {
  mockSlateApi ??= createMockSlateApi()
  return mockSlateApi
}
