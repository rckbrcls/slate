export interface GitFileStatus {
  path: string
  status: "modified" | "added" | "deleted" | "untracked" | "staged"
  staged: boolean
}

export interface GitLogEntry {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}
