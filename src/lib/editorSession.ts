export interface EditorSessionSnapshot {
  activeProjectDir: string | null
  filePath: string | null
}

const STORAGE_KEY = "slate-editor-session"

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

export function readEditorSession(): EditorSessionSnapshot | null {
  if (!canUseSessionStorage()) return null

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<EditorSessionSnapshot>
    return {
      activeProjectDir: parsed.activeProjectDir ?? null,
      filePath: parsed.filePath ?? null,
    }
  } catch {
    return null
  }
}

export function writeEditorSession(snapshot: EditorSessionSnapshot) {
  if (!canUseSessionStorage()) return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export function clearEditorSession() {
  if (!canUseSessionStorage()) return
  window.sessionStorage.removeItem(STORAGE_KEY)
}

export function hasEditorSession(snapshot: EditorSessionSnapshot | null | undefined) {
  return Boolean(snapshot?.activeProjectDir || snapshot?.filePath)
}
