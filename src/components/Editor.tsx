import { useEditor, EditorContent } from "@tiptap/react"
import { useState, useCallback, useEffect } from "react"
import type { Editor as TiptapEditor } from "@tiptap/core"
import { screenplayExtensions } from "@/extensions"
import {
  autocompletePluginKey,
  type AutocompleteState,
} from "@/extensions/ScreenplayAutocomplete"
import { pageNumbersPluginKey } from "@/extensions/PageNumbers"
import { AutocompletePopup } from "./AutocompletePopup"
import type { JSONContent } from "@tiptap/core"

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "sceneHeading" }],
}

interface EditorProps {
  onUpdate?: () => void
  onPaginationUpdate?: () => void
  onEditorReady?: (editor: TiptapEditor) => void
  onEditorDestroy?: (editor: TiptapEditor) => void
}

export function Editor({ onUpdate, onPaginationUpdate, onEditorReady, onEditorDestroy }: EditorProps) {
  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({
    active: false,
    items: [],
    query: "",
    nodeType: "",
    from: 0,
    to: 0,
  })
  const [popupPosition, setPopupPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  const editor = useEditor({
    extensions: screenplayExtensions,
    content: EMPTY_DOC,
    onUpdate: ({ editor }) => {
      onUpdate?.()

      // Update autocomplete state
      const state = autocompletePluginKey.getState(editor.state)
      if (state) {
        setAutocomplete(state)
        if (state.active) {
          const coords = editor.view.coordsAtPos(
            editor.state.selection.$from.pos,
          )
          setPopupPosition({
            top: coords.bottom + 4,
            left: coords.left,
          })
        }
      }
    },
    onTransaction: ({ transaction }) => {
      if (transaction.getMeta(pageNumbersPluginKey)) {
        onPaginationUpdate?.()
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const state = autocompletePluginKey.getState(editor.state)
      if (state) {
        setAutocomplete(state)
        if (state.active) {
          const coords = editor.view.coordsAtPos(
            editor.state.selection.$from.pos,
          )
          setPopupPosition({
            top: coords.bottom + 4,
            left: coords.left,
          })
        }
      }
    },
    editorProps: {
      attributes: {
        class: "screenplay-editor",
        spellcheck: "true",
      },
    },
  })

  useEffect(() => {
    if (!editor) return

    onEditorReady?.(editor)

    return () => {
      onEditorDestroy?.(editor)
    }
  }, [editor, onEditorDestroy, onEditorReady])

  const handleSelect = useCallback(
    (item: string) => {
      if (!editor) return
      const { from, to } = autocomplete
      editor.chain().focus().deleteRange({ from, to }).insertContent(item).run()
      setAutocomplete((prev) => ({ ...prev, active: false, items: [] }))
    },
    [editor, autocomplete],
  )

  const handleClose = useCallback(() => {
    setAutocomplete((prev) => ({ ...prev, active: false, items: [] }))
  }, [])

  if (!editor) return null

  return (
    <>
      <EditorContent editor={editor} />
      <AutocompletePopup
        items={autocomplete.items}
        position={popupPosition}
        onSelect={handleSelect}
        onClose={handleClose}
        visible={autocomplete.active}
      />
    </>
  )
}
