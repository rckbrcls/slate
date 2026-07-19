import { app } from "electron"
import electronUpdater from "electron-updater"

const { autoUpdater } = electronUpdater

export function setupAutoUpdater(): void {
  if (!app.isPackaged) {
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("error", (error) => {
    console.error("[auto-update] error", error)
  })

  autoUpdater.on("update-available", (info) => {
    console.info("[auto-update] available", info.version)
  })

  autoUpdater.on("update-downloaded", (info) => {
    console.info("[auto-update] downloaded", info.version)
  })

  void autoUpdater.checkForUpdatesAndNotify().catch((error: unknown) => {
    console.error("[auto-update] check failed", error)
  })
}
