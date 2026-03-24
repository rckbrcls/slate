import { Command } from "@tauri-apps/plugin-shell"
import type { GitFileStatus, GitLogEntry } from "./types"

interface GitResult {
  stdout: string
  code: number | null
}

async function runGit(cwd: string, args: string[]): Promise<GitResult> {
  const command = Command.create("git", args, { cwd })
  const output = await command.execute()
  return {
    stdout: output.stdout.trim(),
    code: output.code,
  }
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    const result = await runGit(cwd, ["rev-parse", "--is-inside-work-tree"])
    return result.code === 0 && result.stdout === "true"
  } catch {
    return false
  }
}

export async function gitRoot(cwd: string): Promise<string | null> {
  try {
    const result = await runGit(cwd, ["rev-parse", "--show-toplevel"])
    return result.code === 0 ? result.stdout : null
  } catch {
    return null
  }
}

export async function gitStatus(cwd: string): Promise<GitFileStatus[]> {
  try {
    const result = await runGit(cwd, ["status", "--porcelain"])
    if (result.code !== 0 || !result.stdout) return []

    return result.stdout.split("\n").map((line) => {
      const indexStatus = line[0]
      const workTreeStatus = line[1]
      const path = line.substring(3)

      let status: GitFileStatus["status"] = "modified"
      let staged = false

      if (indexStatus === "?" && workTreeStatus === "?") {
        status = "untracked"
      } else if (indexStatus === "A") {
        status = "added"
        staged = true
      } else if (indexStatus === "D" || workTreeStatus === "D") {
        status = "deleted"
        staged = indexStatus === "D"
      } else if (indexStatus === "M" || indexStatus === "R") {
        status = "staged"
        staged = true
      } else if (workTreeStatus === "M") {
        status = "modified"
      }

      return { path, status, staged }
    })
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
    const args = ["log", `--format=%H|%h|%s|%an|%aI`, `-n`, String(limit)]
    if (filePath) args.push("--", filePath)
    const result = await runGit(cwd, args)
    if (result.code !== 0 || !result.stdout) return []

    return result.stdout.split("\n").map((line) => {
      const [hash, shortHash, message, author, date] = line.split("|")
      return { hash, shortHash, message, author, date }
    })
  } catch {
    return []
  }
}

export async function gitDiff(cwd: string, filePath?: string): Promise<string> {
  try {
    const args = ["diff", "HEAD"]
    if (filePath) args.push("--", filePath)
    const result = await runGit(cwd, args)
    return result.code === 0 ? result.stdout : ""
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
    if (files && files.length > 0) {
      await runGit(cwd, ["add", ...files])
    } else {
      await runGit(cwd, ["add", "-A"])
    }
    const result = await runGit(cwd, ["commit", "-m", message])
    return result.code === 0
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
    const result = await runGit(cwd, ["checkout", ref, "--", filePath])
    return result.code === 0
  } catch {
    return false
  }
}
