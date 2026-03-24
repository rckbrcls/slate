import { useEffect, useRef, useCallback } from "react"
import { stat } from "@tauri-apps/plugin-fs"

interface UseFileWatcherOptions {
  enabled: boolean
  onExternalChange: () => void
  interval?: number
}

export function useFileWatcher(
  filePath: string | null,
  opts: UseFileWatcherOptions,
) {
  const { enabled, onExternalChange, interval = 1000 } = opts
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

    const timer = setInterval(async () => {
      try {
        const info = await stat(filePath)
        const mtime = info.mtime?.getTime() ?? null
        if (mtime === null) return

        if (lastMtimeRef.current === null) {
          // First check — just record the baseline
          lastMtimeRef.current = mtime
          return
        }

        if (mtime !== lastMtimeRef.current) {
          lastMtimeRef.current = mtime

          if (justSavedRef.current) {
            // We saved — skip this change
            justSavedRef.current = false
            return
          }

          onExternalChange()
        }
      } catch {
        // File may have been deleted or be inaccessible — ignore
      }
    }, interval)

    return () => clearInterval(timer)
  }, [filePath, enabled, onExternalChange, interval])

  return { notifySaved }
}
