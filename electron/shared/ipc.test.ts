import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { IPC_CHANNELS } from "./ipc"

const mainSource = readFileSync(resolve("electron/main/index.ts"), "utf8")
const preloadSource = readFileSync(resolve("electron/preload/index.ts"), "utf8")

function ipcCallPattern(receiver: string, channelKey: string) {
  return new RegExp(`${receiver}\\(\\s*IPC_CHANNELS\\.${channelKey}\\b`)
}

describe("Electron IPC contract", () => {
  it("uses unique Slate channel names", () => {
    const values = Object.values(IPC_CHANNELS)

    expect(new Set(values).size).toBe(values.length)
    expect(values.every((channel) => channel.startsWith("slate:"))).toBe(true)
  })

  it("keeps invoke channels wired in preload and main", () => {
    const invokeChannelKeys = Object.keys(IPC_CHANNELS).filter(
      (key) => key !== "fileWatchEvent",
    )

    for (const key of invokeChannelKeys) {
      expect(preloadSource).toMatch(ipcCallPattern("ipcRenderer\\.invoke", key))
      expect(mainSource).toMatch(ipcCallPattern("ipcMain\\.handle", key))
    }
  })

  it("keeps file watch events wired in both directions", () => {
    expect(preloadSource).toContain("ipcRenderer.on(IPC_CHANNELS.fileWatchEvent")
    expect(preloadSource).toContain(
      "ipcRenderer.removeListener(IPC_CHANNELS.fileWatchEvent",
    )
    expect(mainSource).toContain("event.sender.send(IPC_CHANNELS.fileWatchEvent")
  })
})
