import { useEditor, EditorContent } from "@tiptap/react"
import { useState, useCallback } from "react"
import type { Editor as TiptapEditor } from "@tiptap/core"
import { screenplayExtensions } from "@/extensions"
import {
  autocompletePluginKey,
  type AutocompleteState,
} from "@/extensions/ScreenplayAutocomplete"
import { AutocompletePopup } from "./AutocompletePopup"
import type { JSONContent } from "@tiptap/core"

const SAMPLE_CONTENT: JSONContent = {
  type: "doc",
  content: [
    {
      type: "sceneHeading",
      attrs: { intExt: "INT", location: "COFFEE SHOP", timeOfDay: "DAY" },
      content: [{ type: "text", text: "INT. COFFEE SHOP - DAY" }],
    },
    {
      type: "action",
      content: [
        {
          type: "text",
          text: "A busy coffee shop. Customers line up at the counter. SARAH (30s, determined) sits alone at a corner table, laptop open.",
        },
      ],
    },
    {
      type: "character",
      content: [{ type: "text", text: "SARAH" }],
    },
    {
      type: "parenthetical",
      content: [{ type: "text", text: "(muttering to herself)" }],
    },
    {
      type: "dialogue",
      content: [
        { type: "text", text: "This has to work. It just has to." },
      ],
    },
    {
      type: "action",
      content: [
        {
          type: "text",
          text: "She types furiously. A BARISTA approaches with a fresh cup of coffee.",
        },
      ],
    },
    {
      type: "character",
      content: [{ type: "text", text: "BARISTA" }],
    },
    {
      type: "dialogue",
      content: [
        { type: "text", text: "Another refill? That's your fourth cup." },
      ],
    },
    {
      type: "character",
      content: [{ type: "text", text: "SARAH" }],
    },
    {
      type: "dialogue",
      content: [{ type: "text", text: "Make it a double." }],
    },
    {
      type: "transition",
      content: [{ type: "text", text: "CUT TO:" }],
    },
    {
      type: "sceneHeading",
      attrs: { intExt: "EXT", location: "COFFEE SHOP", timeOfDay: "NIGHT" },
      content: [{ type: "text", text: "EXT. COFFEE SHOP - NIGHT" }],
    },
    {
      type: "action",
      content: [
        {
          type: "text",
          text: "Rain pours down. Sarah exits, laptop bag over her head as a makeshift umbrella. She looks up at the sky and smiles.",
        },
      ],
    },
  ],
}

interface EditorProps {
  content?: JSONContent
  onUpdate?: () => void
  onEditorReady?: (editor: TiptapEditor) => void
}

export function Editor({ content, onUpdate, onEditorReady }: EditorProps) {
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
    content: content || SAMPLE_CONTENT,
    onCreate: ({ editor }) => {
      onEditorReady?.(editor)
    },
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
