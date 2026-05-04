import type { GitFileStatus, GitLogEntry } from "./types"
import { getSlateApi } from "@/lib/slateApi"

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    return await getSlateApi().git.isRepo(cwd)
  } catch {
    return false
  }
}

export async function gitRoot(cwd: string): Promise<string | null> {
  try {
    return await getSlateApi().git.root(cwd)
  } catch {
    return null
  }
}

export async function gitStatus(cwd: string): Promise<GitFileStatus[]> {
  try {
    return await getSlateApi().git.status(cwd)
  } catch {
    return []
  }
}

export async function gitLog(
  cwd: string,
  filePath?: string,
  limit = 20,
): Promise<GitLogEntry[]> {
  try {
    return await getSlateApi().git.log(cwd, filePath, limit)
  } catch {
    return []
  }
}

export async function gitDiff(cwd: string, filePath?: string): Promise<string> {
  try {
    return await getSlateApi().git.diff(cwd, filePath)
  } catch {
    return ""
  }
}

export async function gitCommit(
  cwd: string,
  message: string,
  files?: string[],
): Promise<boolean> {
  try {
    return await getSlateApi().git.commit(cwd, message, files)
  } catch {
    return false
  }
}

export async function gitCheckoutFile(
  cwd: string,
  ref: string,
  filePath: string,
): Promise<boolean> {
  try {
    return await getSlateApi().git.checkoutFile(cwd, ref, filePath)
  } catch {
    return false
  }
}
