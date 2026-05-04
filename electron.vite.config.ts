import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"

const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(root, "electron/main/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(root, "electron/preload/index.ts"),
        output: {
          format: "cjs",
          entryFileNames: "[name].js",
        },
      },
    },
  },
  renderer: {
    root,
    plugins: [
      viteTsConfigPaths({
        projects: [resolve(root, "tsconfig.json")],
      }),
      tailwindcss(),
      viteReact(),
    ],
    build: {
      rollupOptions: {
        input: resolve(root, "index.html"),
      },
    },
  },
})
