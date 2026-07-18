import { app } from "electron"
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { createInterface } from "node:readline"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import type { AnalysisProgress } from "../shared/types"

interface RpcError {
  code: number
  message: string
  data?: unknown
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  onProgress?: (progress: AnalysisProgress) => void
}

export class EngineClient {
  private process: ChildProcessWithoutNullStreams | null = null
  private pending = new Map<string, PendingRequest>()

  private start() {
    if (this.process && !this.process.killed) return this.process

    const moduleDir = join(fileURLToPath(new URL(".", import.meta.url)))
    const developmentRoot = join(moduleDir, "../..")
    const command = app.isPackaged
      ? join(
          process.resourcesPath,
          "engine",
          process.platform === "win32" ? "slate-engine.exe" : "slate-engine",
        )
      : "uv"
    const args = app.isPackaged
      ? []
      : ["run", "--project", join(developmentRoot, "engine"), "slate-engine"]
    const child = spawn(command, args, {
      cwd: app.isPackaged ? process.resourcesPath : developmentRoot,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    })

    const lines = createInterface({ input: child.stdout })
    lines.on("line", (line) => this.handleLine(line))
    child.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString("utf8").trim()
      if (message) console.error(`Slate engine: ${message}`)
    })
    child.once("error", (error) => this.failAll(error))
    child.once("exit", (code, signal) => {
      this.failAll(new Error(`Slate engine exited (${code ?? signal ?? "unknown"}).`))
      this.process = null
    })
    this.process = child
    return child
  }

  private handleLine(line: string) {
    let message: unknown
    try {
      message = JSON.parse(line)
    } catch {
      console.error("Slate engine returned invalid JSON.")
      return
    }
    if (!message || typeof message !== "object") return
    if ("method" in message && message.method === "job.progress" && "params" in message) {
      const progress = message.params as AnalysisProgress
      this.pending.get(progress.requestId)?.onProgress?.(progress)
      return
    }
    if (!("id" in message) || typeof message.id !== "string") return
    const request = this.pending.get(message.id)
    if (!request) return
    this.pending.delete(message.id)
    if ("error" in message && message.error) {
      const rpcError = message.error as RpcError
      request.reject(new Error(rpcError.message))
      return
    }
    request.resolve("result" in message ? message.result : null)
  }

  private failAll(error: Error) {
    for (const request of this.pending.values()) request.reject(error)
    this.pending.clear()
  }

  request<T>(
    method: string,
    params: Record<string, unknown>,
    options: { requestId?: string; onProgress?: (progress: AnalysisProgress) => void } = {},
  ): Promise<T> {
    const requestId = options.requestId ?? randomUUID()
    const child = this.start()
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, {
        resolve: (value) => resolve(value as T),
        reject,
        onProgress: options.onProgress,
      })
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params })}\n`)
    })
  }

  cancel(requestId: string) {
    if (!this.process || this.process.killed) return
    this.process.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "job.cancel", params: { requestId } })}\n`,
    )
  }

  stop() {
    this.process?.kill()
    this.process = null
  }
}
