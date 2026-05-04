import type { SlateApi } from "../electron/shared/types"

declare global {
  interface Window {
    slate: SlateApi
  }
}

export {}
