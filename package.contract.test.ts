import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

interface PackageJson {
  main?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as PackageJson

describe("desktop package contract", () => {
  it("uses Electron entrypoints and scripts", () => {
    expect(packageJson.main).toBe("out/main/index.js")
    expect(packageJson.scripts?.dev).toBe("electron-vite dev")
    expect(packageJson.scripts?.build).toBe("tsc --noEmit && electron-vite build")
    expect(packageJson.scripts?.["engine:package"]).toContain("engine/package_sidecar.py")
    expect(packageJson.scripts?.dist).toBe(
      "pnpm build && pnpm engine:package && electron-builder",
    )
  })

  it("keeps Electron tooling installed", () => {
    expect(packageJson.devDependencies?.electron).toBeDefined()
    expect(packageJson.devDependencies?.["electron-vite"]).toBeDefined()
    expect(packageJson.devDependencies?.["electron-builder"]).toBeDefined()
  })

  it("keeps Tauri packages and commands out of the desktop shell", () => {
    const packageText = JSON.stringify(packageJson).toLowerCase()

    expect(packageText).not.toContain("tauri")
    expect(packageText).not.toContain("src-tauri")
  })
})
