export interface AssistantEvent {
  type: "assistant"
  message: string
}

export interface ToolUseEvent {
  type: "tool_use"
  name: string
  input: Record<string, unknown>
}

export interface ToolResultEvent {
  type: "tool_result"
  name: string
  output: string
}

export interface ResultEvent {
  type: "result"
  text: string
  cost?: number
}

export interface ErrorEvent {
  type: "error"
  message: string
}

export interface SystemEvent {
  type: "system"
  message: string
}

export interface ThinkingEvent {
  type: "thinking"
  message: string
}

export type ClaudeStreamEvent =
  | AssistantEvent
  | ToolUseEvent
  | ToolResultEvent
  | ResultEvent
  | ErrorEvent
  | SystemEvent
  | ThinkingEvent

export function formatToolUse(name: string, input: Record<string, unknown>): string {
  const filePath = input.file_path as string | undefined
  const fileName = filePath?.split("/").pop() || ""
  switch (name) {
    case "Read": return `Reading ${fileName}`
    case "Edit": return `Editing ${fileName}`
    case "Write": return `Writing ${fileName}`
    case "Bash": return `Running command`
    case "Glob": return `Searching files`
    case "Grep": return `Searching content`
    default: return `${name}${fileName ? ` ${fileName}` : ""}`
  }
}

export function getToolIcon(name: string): string {
  switch (name) {
    case "Read": return "\u{1F4D6}"
    case "Edit": return "\u{270F}\u{FE0F}"
    case "Write": return "\u{1F4BE}"
    case "Bash": return "\u{1F4BB}"
    case "Glob": return "\u{1F50D}"
    case "Grep": return "\u{1F50E}"
    default: return "\u{2699}\u{FE0F}"
  }
}

export function getPhaseLabel(log: ClaudeStreamEvent[]): string {
  if (log.length === 0) return "Thinking..."
  const last = log[log.length - 1]
  switch (last.type) {
    case "thinking": return "Thinking..."
    case "assistant": return "Writing..."
    case "tool_use": {
      const filePath = (last.input?.file_path as string)?.split("/").pop() || ""
      if (last.name === "Read") return `Reading ${filePath}...`
      if (last.name === "Edit") return `Editing ${filePath}...`
      if (last.name === "Write") return `Writing ${filePath}...`
      return "Working..."
    }
    case "tool_result": return "Processing..."
    case "result": return "Finishing up..."
    case "system": return "Working..."
    default: return "Working..."
  }
}

export function parseStreamLine(line: string): ClaudeStreamEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    const data = JSON.parse(trimmed)

    switch (data.type) {
      case "assistant":
        return {
          type: "assistant",
          message: data.message?.content?.[0]?.text || data.content_block?.text || data.text || "",
        }

      case "content_block_start":
        if (data.content_block?.type === "thinking") {
          return { type: "thinking", message: "Reasoning..." }
        }
        return null

      case "content_block_delta":
        if (data.delta?.type === "thinking_delta" && data.delta?.thinking) {
          return { type: "thinking", message: data.delta.thinking }
        }
        if (data.delta?.text) {
          return { type: "assistant", message: data.delta.text }
        }
        return null

      case "message_start":
        return null

      case "message_stop":
        return null

      case "tool_use":
        return {
          type: "tool_use",
          name: data.name || data.tool_name || "",
          input: data.input || {},
        }

      case "tool_result":
        return {
          type: "tool_result",
          name: data.name || "",
          output: typeof data.output === "string" ? data.output : JSON.stringify(data.output || ""),
        }

      case "result":
        return {
          type: "result",
          text: data.result || data.text || "",
          cost: data.cost_usd || data.cost,
        }

      case "error":
        return {
          type: "error",
          message: data.error?.message || data.message || "Unknown error",
        }

      case "system":
        return {
          type: "system",
          message: data.message || data.text || "",
        }

      default:
        // Unknown event type — return as system message
        if (data.message || data.text) {
          return { type: "system", message: data.message || data.text }
        }
        return null
    }
  } catch {
    // Not valid JSON — treat as plain text output
    if (trimmed.length > 0) {
      return { type: "system", message: trimmed }
    }
    return null
  }
}
