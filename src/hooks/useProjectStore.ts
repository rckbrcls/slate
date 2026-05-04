import { useState, useEffect, useCallback, useRef } from "react"
import { getPathName, getSlateApi } from "@/lib/slateApi"
import type { ProjectEntry } from "../../electron/shared/types"

export type { ProjectEntry }

export function useProjectStore() {
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const data = await getSlateApi().projects.read()
        if (!cancelled) {
          setProjects(data)
        }
      } catch (error) {
        console.error("Failed to load Slate projects", error)
        if (!cancelled) {
          setProjects([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    mountedRef.current = true
    init()
    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [])

  const persist = useCallback(async (updated: ProjectEntry[]) => {
    if (!mountedRef.current) return
    await getSlateApi().projects.write(updated)
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
        const name = getPathName(dirPath)
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

  const updateLastFile = useCallback(async (dirPath: string, filePath: string | null) => {
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
