import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface AutocompletePopupProps {
  items: string[]
  position: { top: number; left: number } | null
  onSelect: (item: string) => void
  onClose: () => void
  visible: boolean
}

export function AutocompletePopup({
  items,
  position,
  onSelect,
  onClose,
  visible,
}: AutocompletePopupProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible || items.length === 0) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((i) => (i + 1) % items.length)
          break
        case "ArrowUp":
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((i) => (i - 1 + items.length) % items.length)
          break
        case "Enter":
        case "Tab":
          e.preventDefault()
          e.stopPropagation()
          onSelect(items[selectedIndex])
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    },
    [visible, items, selectedIndex, onSelect, onClose],
  )

  useEffect(() => {
    if (visible) {
      window.addEventListener("keydown", handleKeyDown, true)
      return () => window.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [visible, handleKeyDown])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement
      selected?.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  if (!visible || !position || items.length === 0) return null

  return (
    <div
      ref={listRef}
      className="fixed z-50 max-h-48 min-w-[200px] overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {items.map((item, index) => (
        <div
          key={item}
          className={cn(
            "cursor-pointer rounded-sm px-2 py-1.5 font-mono text-xs",
            index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "text-popover-foreground hover:bg-accent/50",
          )}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(item)
          }}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          {item}
        </div>
      ))}
    </div>
  )
}
