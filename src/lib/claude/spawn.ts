import { Command } from "@tauri-apps/plugin-shell"
import { parseStreamLine, type ClaudeStreamEvent } from "./streamParser"

export interface ClaudeSpawnOptions {
  instruction: string
  cwd: string
  onEvent: (event: ClaudeStreamEvent) => void
  onDone: (code: number | null) => void
  onError: (error: string) => void
}

export async function spawnClaude({
  instruction,
  cwd,
  onEvent,
  onDone,
  onError,
}: ClaudeSpawnOptions): Promise<() => void> {
  const command = Command.create("claude", [
    "--print",
    "--output-format",
    "stream-json",
    "--allowedTools",
    "Read,Write,Edit",
    instruction,
  ], { cwd })

  command.stdout.on("data", (line) => {
    const event = parseStreamLine(line)
    if (event) onEvent(event)
  })

  command.stderr.on("data", (line) => {
    const event = parseStreamLine(line)
    if (event) {
      onEvent(event)
    }
  })

  command.on("close", (payload) => {
    onDone(payload.code)
  })

  command.on("error", (error) => {
    onError(error)
  })

  const child = await command.spawn()

  // Return cleanup function to kill the process
  return () => {
    child.kill().catch(() => {
      // Ignore kill errors (process may have already exited)
    })
  }
}
