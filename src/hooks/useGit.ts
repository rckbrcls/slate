import { useState, useCallback, useEffect, useRef } from "react"
import type { GitFileStatus, GitLogEntry } from "@/lib/git/types"
import {
  isGitRepo,
  gitRoot,
  gitStatus as getGitStatus,
  gitLog as getGitLog,
  gitCommit as doGitCommit,
  gitDiff as getGitDiff,
} from "@/lib/git/commands"

const REFRESH_INTERVAL = 5000

export interface UseGitReturn {
  isRepo: boolean
  root: string | null
  status: GitFileStatus[]
  log: GitLogEntry[]
  loading: boolean
  refresh: () => void
  commit: (message: string, files?: string[]) => Promise<boolean>
  getFileDiff: (filePath: string) => Promise<string>
}

export function useGit(projectDir: string | null): UseGitReturn {
  const [isRepo, setIsRepo] = useState(false)
  const [root, setRoot] = useState<string | null>(null)
  const [status, setStatus] = useState<GitFileStatus[]>([])
  const [log, setLog] = useState<GitLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!projectDir) return
    try {
      const [statusResult, logResult] = await Promise.all([
        getGitStatus(projectDir),
        getGitLog(projectDir),
      ])
      setStatus(statusResult)
      setLog(logResult)
    } catch {
      // Silently fail on refresh
    }
  }, [projectDir])

  // Check if directory is a git repo when projectDir changes
  useEffect(() => {
    if (!projectDir) {
      setIsRepo(false)
      setRoot(null)
      setStatus([])
      setLog([])
      return
    }

    let cancelled = false
    setLoading(true)

    async function check() {
      const repo = await isGitRepo(projectDir!)
      if (cancelled) return
      setIsRepo(repo)

      if (repo) {
        const rootPath = await gitRoot(projectDir!)
        if (cancelled) return
        setRoot(rootPath)
        await refresh()
      }
      setLoading(false)
    }

    check()
    return () => { cancelled = true }
  }, [projectDir, refresh])

  // Auto-refresh every 5s
  useEffect(() => {
    if (!isRepo || !projectDir) return

    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRepo, projectDir, refresh])

  const commit = useCallback(
    async (message: string, files?: string[]) => {
      if (!projectDir) return false
      const ok = await doGitCommit(projectDir, message, files)
      if (ok) await refresh()
      return ok
    },
    [projectDir, refresh],
  )

  const getFileDiff = useCallback(
    async (filePath: string) => {
      if (!projectDir) return ""
      return getGitDiff(projectDir, filePath)
    },
    [projectDir],
  )

  return {
    isRepo,
    root,
    status,
    log,
    loading,
    refresh,
    commit,
    getFileDiff,
  }
}
