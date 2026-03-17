import { open, save } from "@tauri-apps/plugin-dialog"
import { readTextFile, writeTextFile, writeFile } from "@tauri-apps/plugin-fs"

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

export async function openFountainFile(): Promise<
  FileResponse<{ path: string; content: string }>
> {
  try {
    const selected = await open({
      multiple: false,
      filters: FOUNTAIN_FILTERS,
    })

    if (!selected) return { ok: false, error: "cancelled" }

    const content = await readTextFile(selected)
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
    await writeTextFile(path, content)
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
    const path = await save({
      filters: FOUNTAIN_FILTERS,
      defaultPath: "untitled.fountain",
    })

    if (!path) return { ok: false, error: "cancelled" }

    await writeTextFile(path, content)
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
  filters: Array<{ name: string; extensions: string[] }>,
  defaultPath?: string,
): Promise<FileResponse<string>> {
  try {
    const path = await save({
      filters,
      defaultPath,
    })

    if (!path) return { ok: false, error: "cancelled" }

    await writeTextFile(path, content)
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
  filters: Array<{ name: string; extensions: string[] }>,
  defaultPath?: string,
): Promise<FileResponse<string>> {
  try {
    const path = await save({
      filters,
      defaultPath,
    })

    if (!path) return { ok: false, error: "cancelled" }

    await writeFile(path, content)
    return { ok: true, data: path }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to save file: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
