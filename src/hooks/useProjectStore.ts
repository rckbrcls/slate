import { useState, useEffect, useCallback, useRef } from "react"
import { load, type Store } from "@tauri-apps/plugin-store"

export interface ProjectEntry {
  path: string
  name: string
  lastFile: string | null
  lastOpenedAt: string
  favorite: boolean
}

const STORE_KEY = "projects"

export function useProjectStore() {
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [loading, setLoading] = useState(true)
  const storeRef = useRef<Store | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const store = await load("slate-projects.json", { defaults: {}, autoSave: false })
      if (cancelled) return
      storeRef.current = store
      const data = await store.get<ProjectEntry[]>(STORE_KEY)
      if (!cancelled) {
        setProjects(data ?? [])
        setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const persist = useCallback(async (updated: ProjectEntry[]) => {
    const store = storeRef.current
    if (!store) return
    await store.set(STORE_KEY, updated)
    await store.save()
  }, [])

  const addProject = useCallback(async (dirPath: string) => {
    setProjects((prev) => {
      const existing = prev.find((p) => p.path === dirPath)
      const now = new Date().toISOString()
      let updated: ProjectEntry[]
      if (existing) {
        updated = prev.map((p) =>
          p.path === dirPath ? { ...p, lastOpenedAt: now } : p,
        )
      } else {
        const name = dirPath.split("/").pop() || dirPath
        updated = [
          ...prev,
          { path: dirPath, name, lastFile: null, lastOpenedAt: now, favorite: false },
        ]
      }
      persist(updated)
      return updated
    })
  }, [persist])

  const removeProject = useCallback(async (dirPath: string) => {
    setProjects((prev) => {
      const updated = prev.filter((p) => p.path !== dirPath)
      persist(updated)
      return updated
    })
  }, [persist])

  const updateLastFile = useCallback(async (dirPath: string, filePath: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.path === dirPath ? { ...p, lastFile: filePath } : p,
      )
      persist(updated)
      return updated
    })
  }, [persist])

  const toggleFavorite = useCallback(async (dirPath: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.path === dirPath ? { ...p, favorite: !p.favorite } : p,
      )
      persist(updated)
      return updated
    })
  }, [persist])

  const touchProject = useCallback(async (dirPath: string) => {
    setProjects((prev) => {
      const now = new Date().toISOString()
      const updated = prev.map((p) =>
        p.path === dirPath ? { ...p, lastOpenedAt: now } : p,
      )
      persist(updated)
      return updated
    })
  }, [persist])

  return {
    projects,
    loading,
    addProject,
    removeProject,
    updateLastFile,
    toggleFavorite,
    touchProject,
  }
}
