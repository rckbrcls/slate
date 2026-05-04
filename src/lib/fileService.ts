import { getSlateApi } from "@/lib/slateApi"
import type { SlateFileEntry, SlateFileFilter, SlateFileStat } from "../../electron/shared/types"

export interface FileResult<T> {
  ok: true
  data: T
}

export interface FileError {
  ok: false
  error: string
}

export type FileResponse<T> = FileResult<T> | FileError

const FOUNTAIN_FILTERS = [
  {
    name: "Fountain",
    extensions: ["fountain", "spmd", "txt"],
  },
]

export async function readFountainFile(path: string): Promise<string> {
  return getSlateApi().readTextFile(path)
}

export async function readDirectory(path: string): Promise<SlateFileEntry[]> {
  return getSlateApi().readDirectory(path)
}

export async function statFile(path: string): Promise<SlateFileStat | null> {
  return getSlateApi().statFile(path)
}

export function watchFile(
  path: string,
  callback: Parameters<ReturnType<typeof getSlateApi>["watchFile"]>[1],
) {
  return getSlateApi().watchFile(path, callback)
}

export async function openProjectDirectory(): Promise<FileResponse<string>> {
  try {
    const path = await getSlateApi().openDirectoryDialog()

    if (!path) return { ok: false, error: "cancelled" }

    return { ok: true, data: path }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to open folder: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export async function openFountainFile(): Promise<
  FileResponse<{ path: string; content: string }>
> {
  try {
    const selected = await getSlateApi().openFileDialog({
      filters: FOUNTAIN_FILTERS,
    })

    if (!selected) return { ok: false, error: "cancelled" }

    const content = await getSlateApi().readTextFile(selected)
    return { ok: true, data: { path: selected, content } }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to open file: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export async function saveFountainFile(
  path: string,
  content: string,
): Promise<FileResponse<void>> {
  try {
    await getSlateApi().writeTextFile(path, content)
    return { ok: true, data: undefined }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to save file: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export async function saveAsFountainFile(
  content: string,
): Promise<FileResponse<string>> {
  try {
    const path = await getSlateApi().saveFileDialog({
      filters: FOUNTAIN_FILTERS,
      defaultPath: "untitled.fountain",
    })

    if (!path) return { ok: false, error: "cancelled" }

    await getSlateApi().writeTextFile(path, content)
    return { ok: true, data: path }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to save file: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export async function saveExportFile(
  content: string,
  filters: SlateFileFilter[],
  defaultPath?: string,
): Promise<FileResponse<string>> {
  try {
    const path = await getSlateApi().saveFileDialog({
      filters,
      defaultPath,
    })

    if (!path) return { ok: false, error: "cancelled" }

    await getSlateApi().writeTextFile(path, content)
    return { ok: true, data: path }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to export file: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

export async function saveBinaryFile(
  content: Uint8Array,
  filters: SlateFileFilter[],
  defaultPath?: string,
): Promise<FileResponse<string>> {
  try {
    const path = await getSlateApi().saveFileDialog({
      filters,
      defaultPath,
    })

    if (!path) return { ok: false, error: "cancelled" }

    await getSlateApi().writeBinaryFile(path, content)
    return { ok: true, data: path }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to save file: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
