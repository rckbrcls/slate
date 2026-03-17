import { useState, useCallback, useRef, useEffect } from "react"
import type { Editor } from "@tiptap/core"
import type { TitlePage } from "@/lib/fountain/types"
import { editorToFountain } from "@/lib/fountain/serialize"
import { fountainToEditor } from "@/lib/fountain/deserialize"
import {
  openFountainFile,
  saveFountainFile,
  saveAsFountainFile,
} from "@/lib/fileService"

interface DocumentState {
  filePath: string | null
  isDirty: boolean
  titlePage: TitlePage
  fileName: string
  error: string | null
}

export function useDocument(editorRef: React.RefObject<Editor | null>) {
  const [state, setState] = useState<DocumentState>({
    filePath: null,
    isDirty: false,
    titlePage: {},
    fileName: "Untitled",
    error: null,
  })

  const titlePageRef = useRef<TitlePage>({})
  titlePageRef.current = state.titlePage

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  // Auto-save debounced (3 seconds after last edit, only if file has a path)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markDirty = useCallback(() => {
    setState((prev) => ({ ...prev, isDirty: true }))

    // Clear previous auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  const getFountainContent = useCallback((): string | null => {
    const editor = editorRef.current
    if (!editor) return null
    return editorToFountain(editor.state.doc, titlePageRef.current)
  }, [editorRef])

  // Trigger auto-save when dirty changes
  useEffect(() => {
    if (!state.isDirty || !state.filePath) return

    autoSaveTimerRef.current = setTimeout(async () => {
      const content = getFountainContent()
      if (!content || !state.filePath) return
      const result = await saveFountainFile(state.filePath, content)
      if (result.ok) {
        setState((prev) => ({ ...prev, isDirty: false }))
      }
    }, 3000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [state.isDirty, state.filePath, getFountainContent])

  const openFile = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return

    const result = await openFountainFile()
    if (!result.ok) {
      if (result.error !== "cancelled") {
        setState((prev) => ({ ...prev, error: result.error }))
      }
      return
    }

    const { content, titlePage } = fountainToEditor(result.data.content)
    editor.commands.setContent(content)

    const fileName = result.data.path.split("/").pop() || "Untitled"
    setState({
      filePath: result.data.path,
      isDirty: false,
      titlePage,
      fileName,
      error: null,
    })
    titlePageRef.current = titlePage
  }, [editorRef])

  const saveFile = useCallback(async () => {
    const content = getFountainContent()
    if (!content) return

    if (state.filePath) {
      const result = await saveFountainFile(state.filePath, content)
      if (!result.ok) {
        setState((prev) => ({ ...prev, error: result.error }))
        return
      }
      setState((prev) => ({ ...prev, isDirty: false, error: null }))
    } else {
      const result = await saveAsFountainFile(content)
      if (!result.ok) {
        if (result.error !== "cancelled") {
          setState((prev) => ({ ...prev, error: result.error }))
        }
        return
      }
      const fileName = result.data.split("/").pop() || "Untitled"
      setState((prev) => ({
        ...prev,
        filePath: result.data,
        isDirty: false,
        fileName,
        error: null,
      }))
    }
  }, [state.filePath, getFountainContent])

  const saveAsFile = useCallback(async () => {
    const content = getFountainContent()
    if (!content) return

    const result = await saveAsFountainFile(content)
    if (!result.ok) {
      if (result.error !== "cancelled") {
        setState((prev) => ({ ...prev, error: result.error }))
      }
      return
    }
    const fileName = result.data.split("/").pop() || "Untitled"
    setState((prev) => ({
      ...prev,
      filePath: result.data,
      isDirty: false,
      fileName,
      error: null,
    }))
  }, [getFountainContent])

  const newFile = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    editor.commands.setContent({
      type: "doc",
      content: [{ type: "sceneHeading" }],
    })

    setState({
      filePath: null,
      isDirty: false,
      titlePage: {},
      fileName: "Untitled",
      error: null,
    })
    titlePageRef.current = {}
  }, [editorRef])

  return {
    ...state,
    clearError,
    markDirty,
    openFile,
    saveFile,
    saveAsFile,
    newFile,
  }
}
