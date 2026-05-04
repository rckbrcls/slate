import { getMockSlateApi } from "@/lib/mockSlateApi"

function canUseMockSlateApi() {
  if (typeof window === "undefined" || !import.meta.env.DEV) return false

  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1"
  )
}

export function getSlateApi() {
  if (typeof window !== "undefined" && window.slate) {
    return window.slate
  }

  if (canUseMockSlateApi()) {
    return getMockSlateApi()
  }

  throw new Error("Slate desktop API is unavailable")
}

export function getPathName(filePath: string | null) {
  if (!filePath) return "Untitled"
  return filePath.split(/[\\/]/).pop() || "Untitled"
}

export function getPathDir(filePath: string | null) {
  if (!filePath) return null
  const slashIndex = filePath.lastIndexOf("/")
  const backslashIndex = filePath.lastIndexOf("\\")
  const lastSeparator = Math.max(slashIndex, backslashIndex)
  return lastSeparator > 0 ? filePath.substring(0, lastSeparator) : null
}

export function isPathInsideDirectory(filePath: string, dirPath: string) {
  const normalizedFile = filePath.replaceAll("\\", "/")
  const normalizedDir = dirPath.replaceAll("\\", "/").replace(/\/+$/, "")
  return (
    normalizedFile === normalizedDir ||
    normalizedFile.startsWith(`${normalizedDir}/`)
  )
}
