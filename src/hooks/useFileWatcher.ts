import { useEffect, useRef, useCallback } from "react"
import { statFile, watchFile } from "@/lib/fileService"

interface UseFileWatcherOptions {
  enabled: boolean
  onExternalChange: () => void
}

export function useFileWatcher(
  filePath: string | null,
  opts: UseFileWatcherOptions,
) {
  const { enabled, onExternalChange } = opts
  const lastMtimeRef = useRef<number | null>(null)
  const justSavedRef = useRef(false)

  // Called by the parent after saving — suppresses the next mtime change
  const notifySaved = useCallback(() => {
    justSavedRef.current = true
  }, [])

  // Reset mtime tracking when file changes
  useEffect(() => {
    lastMtimeRef.current = null
    justSavedRef.current = false
  }, [filePath])

  useEffect(() => {
    if (!filePath || !enabled) return
    const watchedPath = filePath

    let cleanup: (() => void) | null = null
    let cancelled = false

    async function recordBaseline() {
      try {
        const info = await statFile(watchedPath)
        if (!cancelled) {
          lastMtimeRef.current = info?.mtimeMs ?? null
        }
      } catch {
        if (!cancelled) {
          lastMtimeRef.current = null
        }
      }
    }

    void recordBaseline()

    cleanup = watchFile(watchedPath, (event) => {
      const mtime = event.mtimeMs
      if (mtime === null) return

      if (lastMtimeRef.current === null) {
        lastMtimeRef.current = mtime
        return
      }

      if (mtime !== lastMtimeRef.current) {
        lastMtimeRef.current = mtime

        if (justSavedRef.current) {
          // We saved, so the next disk event belongs to this app.
          justSavedRef.current = false
          return
        }

        onExternalChange()
      }
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [filePath, enabled, onExternalChange])

  return { notifySaved }
}
