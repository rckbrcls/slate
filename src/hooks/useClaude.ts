import { useState, useCallback, useRef, useEffect } from "react"
import type { Editor } from "@tiptap/core"
import { diffLines } from "diff"
import { spawnClaude } from "@/lib/claude/spawn"
import type { ClaudeStreamEvent } from "@/lib/claude/streamParser"
import type { DiffHunk } from "@/extensions/AIDiff"
import { editorToFountain } from "@/lib/fountain/serialize"
import { fountainToEditor } from "@/lib/fountain/deserialize"
import { readTextFile } from "@tauri-apps/plugin-fs"

export type ClaudeStatus = "idle" | "running" | "reviewing"

export interface UseClaudeReturn {
  status: ClaudeStatus
  log: ClaudeStreamEvent[]
  error: string | null
  diffHunkCount: number
  runClaude: (instruction: string) => Promise<void>
  acceptAll: () => void
  rejectAll: () => void
}

export function useClaude(
  editorRef: React.RefObject<Editor | null>,
  filePath: string | null,
  saveFile: () => Promise<void>,
): UseClaudeReturn {
  const [status, setStatus] = useState<ClaudeStatus>("idle")
  const [log, setLog] = useState<ClaudeStreamEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [diffHunkCount, setDiffHunkCount] = useState(0)
  const originalContentRef = useRef<string | null>(null)
  const killRef = useRef<(() => void) | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (killRef.current) killRef.current()
    }
  }, [])

  const runClaude = useCallback(
    async (instruction: string) => {
      const editor = editorRef.current
      if (!editor || !filePath) {
        setError("Save the file first before running Claude.")
        return
      }

      // Save current state first
      await saveFile()

      // Capture original content for diff comparison
      originalContentRef.current = editorToFountain(editor.state.doc)

      setStatus("running")
      setLog([{ type: "system", message: "Analyzing your screenplay..." }])
      setError(null)
      setDiffHunkCount(0)

      const cwd = filePath.substring(0, filePath.lastIndexOf("/"))

      try {
        const kill = await spawnClaude({
          instruction: `Working on the screenplay file "${filePath.split("/").pop()}". ${instruction}`,
          cwd,
          onEvent(event) {
            if (event.type === "assistant") {
              // Accumulate text deltas into a single assistant event
              setLog((prev) => {
                const last = prev[prev.length - 1]
                if (last?.type === "assistant") {
                  return [...prev.slice(0, -1), { ...last, message: last.message + event.message }]
                }
                return [...prev, event]
              })
            } else if (event.type === "thinking") {
              // Accumulate thinking deltas similarly
              setLog((prev) => {
                const last = prev[prev.length - 1]
                if (last?.type === "thinking") {
                  return [...prev.slice(0, -1), { ...last, message: last.message + event.message }]
                }
                return [...prev, event]
              })
            } else {
              setLog((prev) => [...prev, event])
            }
            if (event.type === "error") {
              setError(event.message)
            }
          },
          async onDone(code) {
            killRef.current = null
            if (code !== 0 && code !== null) {
              setError(`Claude exited with code ${code}`)
              setStatus("idle")
              return
            }

            // Re-read the file to get Claude's changes
            try {
              const newFileContent = await readTextFile(filePath)
              const original = originalContentRef.current
              if (!original) {
                setStatus("idle")
                return
              }

              // Compute diff
              const changes = diffLines(original, newFileContent)
              const hunks: DiffHunk[] = []

              // Load the new content into the editor
              const { content } = fountainToEditor(newFileContent)
              editor.commands.setContent(content)

              // Map diff changes to document positions
              let pos = 1 // Start after doc open tag
              for (const change of changes) {
                const text = change.value
                if (change.added) {
                  // Find the approximate position in the new doc
                  const endPos = Math.min(pos + text.length, editor.state.doc.content.size)
                  hunks.push({ type: "added", fromPos: pos, toPos: endPos, text })
                  pos = endPos
                } else if (change.removed) {
                  // Removed text isn't in the new doc, create a marker
                  hunks.push({ type: "removed", fromPos: pos, toPos: pos, text })
                } else {
                  // Unchanged text — advance position
                  pos += text.length
                }
              }

              if (hunks.length > 0) {
                setDiffHunkCount(hunks.length)
                editor.commands.setDiffHunks(hunks)
                setStatus("reviewing")
              } else {
                setStatus("idle")
              }
            } catch (err) {
              setError(`Failed to read updated file: ${err instanceof Error ? err.message : String(err)}`)
              setStatus("idle")
            }
          },
          onError(errorMsg) {
            killRef.current = null
            setError(errorMsg)
            setStatus("idle")
          },
        })
        killRef.current = kill
      } catch (err) {
        setError(`Failed to start Claude: ${err instanceof Error ? err.message : String(err)}`)
        setStatus("idle")
      }
    },
    [editorRef, filePath, saveFile],
  )

  const acceptAll = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.commands.clearDiff()
    originalContentRef.current = null
    setStatus("idle")
    setDiffHunkCount(0)
  }, [editorRef])

  const rejectAll = useCallback(() => {
    const editor = editorRef.current
    if (!editor || !originalContentRef.current) return

    // Restore original content
    const { content } = fountainToEditor(originalContentRef.current)
    editor.commands.setContent(content)
    editor.commands.clearDiff()
    originalContentRef.current = null
    setStatus("idle")
    setDiffHunkCount(0)
  }, [editorRef])

  return {
    status,
    log,
    error,
    diffHunkCount,
    runClaude,
    acceptAll,
    rejectAll,
  }
}
