import { useState, useCallback, useRef, useEffect } from "react"
import type { Editor } from "@tiptap/core"
import type { TitlePage } from "@/lib/fountain/types"
import { editorToFountain } from "@/lib/fountain/serialize"
import { fountainToEditor } from "@/lib/fountain/deserialize"
import {
  openFountainFile,
  readFountainFile,
  saveFountainFile,
  saveAsFountainFile,
} from "@/lib/fileService"
import { getPathName } from "@/lib/slateApi"
import { useFileWatcher } from "@/hooks/useFileWatcher"

interface DocumentState {
  filePath: string | null
  isDirty: boolean
  titlePage: TitlePage
  fileName: string
  error: string | null
  externalChangePending: boolean
  contentVersion: number
}

function getFileName(path: string | null) {
  return getPathName(path)
}

function getEmptyDocument() {
  return {
    type: "doc" as const,
    content: [{ type: "sceneHeading" as const }],
  }
}

export function useDocument(editorRef: React.RefObject<Editor | null>) {
  const [state, setState] = useState<DocumentState>({
    filePath: null,
    isDirty: false,
    titlePage: {},
    fileName: "Untitled",
    error: null,
    externalChangePending: false,
    contentVersion: 0,
  })

  const titlePageRef = useRef<TitlePage>({})
  titlePageRef.current = state.titlePage
  const contentVersionRef = useRef(0)
  const ignoreNextEditorUpdateRef = useRef(false)

  const nextContentVersion = useCallback(() => {
    contentVersionRef.current += 1
    return contentVersionRef.current
  }, [])

  const markProgrammaticContentUpdate = useCallback(() => {
    ignoreNextEditorUpdateRef.current = true
  }, [])

  const consumeProgrammaticContentUpdate = useCallback(() => {
    const shouldIgnore = ignoreNextEditorUpdateRef.current
    ignoreNextEditorUpdateRef.current = false
    return shouldIgnore
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markDirty = useCallback(() => {
    setState((prev) => ({ ...prev, isDirty: true }))

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  const getLiveEditor = useCallback(() => {
    const editor = editorRef.current
    if (!editor || editor.isDestroyed) return null
    return editor
  }, [editorRef])

  const getFountainContent = useCallback((): string | null => {
    const editor = getLiveEditor()
    if (!editor) return null
    return editorToFountain(editor.state.doc, titlePageRef.current)
  }, [getLiveEditor])

  const loadDocument = useCallback(async (path: string) => {
    const raw = await readFountainFile(path)
    const { content, titlePage } = fountainToEditor(raw)
    const editor = getLiveEditor()
    if (!editor) return false

    markProgrammaticContentUpdate()
    editor.commands.setContent(content)
    titlePageRef.current = titlePage
    setState({
      filePath: path,
      isDirty: false,
      titlePage,
      fileName: getFileName(path),
      error: null,
      externalChangePending: false,
      contentVersion: nextContentVersion(),
    })

    return true
  }, [getLiveEditor, markProgrammaticContentUpdate, nextContentVersion])

  const handleExternalChange = useCallback(async () => {
    if (!state.filePath) return

    if (state.isDirty) {
      setState((prev) => (
        prev.externalChangePending ? prev : { ...prev, externalChangePending: true }
      ))
      return
    }

    try {
      const newFileContent = await readFountainFile(state.filePath)
      const editor = getLiveEditor()
      if (!editor) return
      const currentContent = editorToFountain(editor.state.doc, titlePageRef.current)
      if (!currentContent || currentContent === newFileContent) return

      const { content, titlePage } = fountainToEditor(newFileContent)
      markProgrammaticContentUpdate()
      editor.commands.setContent(content)
      titlePageRef.current = titlePage
      setState((prev) => ({
        ...prev,
        isDirty: false,
        titlePage,
        error: null,
        externalChangePending: false,
        contentVersion: nextContentVersion(),
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: `Failed to read external changes: ${err instanceof Error ? err.message : String(err)}`,
      }))
    }
  }, [getLiveEditor, markProgrammaticContentUpdate, nextContentVersion, state.filePath, state.isDirty])

  const { notifySaved } = useFileWatcher(state.filePath, {
    enabled: Boolean(state.filePath),
    onExternalChange: handleExternalChange,
  })

  const reloadFromDisk = useCallback(async () => {
    if (!state.filePath) return false

    try {
      return await loadDocument(state.filePath)
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: `Failed to reload file: ${err instanceof Error ? err.message : String(err)}`,
      }))
      return false
    }
  }, [state.filePath, loadDocument])

  useEffect(() => {
    if (!state.isDirty || !state.filePath) return

    autoSaveTimerRef.current = setTimeout(async () => {
      const content = getFountainContent()
      if (!content || !state.filePath) return

      notifySaved()
      const result = await saveFountainFile(state.filePath, content)
      if (result.ok) {
        setState((prev) => ({
          ...prev,
          isDirty: false,
          error: null,
          externalChangePending: false,
        }))
      }
    }, 3000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [state.isDirty, state.filePath, getFountainContent, notifySaved])

  const openFile = useCallback(async () => {
    const editor = getLiveEditor()
    if (!editor) return null

    const result = await openFountainFile()
    if (!result.ok) {
      if (result.error !== "cancelled") {
        setState((prev) => ({ ...prev, error: result.error }))
      }
      return null
    }

    const { content, titlePage } = fountainToEditor(result.data.content)
    markProgrammaticContentUpdate()
    editor.commands.setContent(content)

    setState({
      filePath: result.data.path,
      isDirty: false,
      titlePage,
      fileName: getFileName(result.data.path),
      error: null,
      externalChangePending: false,
      contentVersion: nextContentVersion(),
    })
    titlePageRef.current = titlePage
    return result.data.path
  }, [getLiveEditor, markProgrammaticContentUpdate, nextContentVersion])

  const saveFile = useCallback(async () => {
    const content = getFountainContent()
    if (!content) return false

    if (state.filePath) {
      notifySaved()
      const result = await saveFountainFile(state.filePath, content)
      if (!result.ok) {
        setState((prev) => ({ ...prev, error: result.error }))
        return false
      }
      setState((prev) => ({
        ...prev,
        isDirty: false,
        error: null,
        externalChangePending: false,
      }))
      return true
    }

    const result = await saveAsFountainFile(content)
    if (!result.ok) {
      if (result.error !== "cancelled") {
        setState((prev) => ({ ...prev, error: result.error }))
      }
      return false
    }

    setState((prev) => ({
      ...prev,
      filePath: result.data,
      isDirty: false,
      fileName: getFileName(result.data),
      error: null,
      externalChangePending: false,
    }))
    return true
  }, [state.filePath, getFountainContent, notifySaved])

  const saveAsFile = useCallback(async () => {
    const content = getFountainContent()
    if (!content) return null

    const result = await saveAsFountainFile(content)
    if (!result.ok) {
      if (result.error !== "cancelled") {
        setState((prev) => ({ ...prev, error: result.error }))
      }
      return null
    }

    setState((prev) => ({
      ...prev,
      filePath: result.data,
      isDirty: false,
      fileName: getFileName(result.data),
      error: null,
      externalChangePending: false,
    }))
    return result.data
  }, [getFountainContent])

  const openFilePath = useCallback(async (path: string) => {
    try {
      return await loadDocument(path)
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: `Failed to open file: ${err instanceof Error ? err.message : String(err)}`,
      }))
      return false
    }
  }, [loadDocument])

  const newFile = useCallback(() => {
    const editor = getLiveEditor()
    if (!editor) return

    markProgrammaticContentUpdate()
    editor.commands.setContent(getEmptyDocument())

    setState({
      filePath: null,
      isDirty: false,
      titlePage: {},
      fileName: "Untitled",
      error: null,
      externalChangePending: false,
      contentVersion: nextContentVersion(),
    })
    titlePageRef.current = {}
  }, [getLiveEditor, markProgrammaticContentUpdate, nextContentVersion])

  const closeProject = useCallback(() => {
    const editor = getLiveEditor()
    if (editor) {
      markProgrammaticContentUpdate()
      editor.commands.setContent(getEmptyDocument())
    }

    setState({
      filePath: null,
      isDirty: false,
      titlePage: {},
      fileName: "Untitled",
      error: null,
      externalChangePending: false,
      contentVersion: nextContentVersion(),
    })
    titlePageRef.current = {}
  }, [getLiveEditor, markProgrammaticContentUpdate, nextContentVersion])

  return {
    filePath: state.filePath,
    isDirty: state.isDirty,
    titlePage: state.titlePage,
    fileName: state.fileName,
    error: state.error,
    externalChangePending: state.externalChangePending,
    contentVersion: state.contentVersion,
    clearError,
    consumeProgrammaticContentUpdate,
    markDirty,
    openFile,
    openFilePath,
    saveFile,
    saveAsFile,
    reloadFromDisk,
    newFile,
    closeProject,
  }
}
