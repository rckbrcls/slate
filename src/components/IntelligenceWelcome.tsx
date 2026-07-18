import { useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, FileClock, FolderOpen, Plus, Search, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ANALYSIS_PACKS } from "@/lib/intelligenceApi"
import type { ProjectEntry } from "@/hooks/useProjectStore"

interface IntelligenceWelcomeProps {
  projects: ProjectEntry[]
  loading: boolean
  error: string | null
  onCreateProject: (name: string, analysisPack: string) => Promise<void>
  onOpenProject: (project: ProjectEntry) => Promise<void>
  onBrowseProject: () => Promise<void>
  onToggleFavorite: (path: string) => void
  onRemoveProject: (path: string) => void
}

export function IntelligenceWelcome({
  projects,
  loading,
  error,
  onCreateProject,
  onOpenProject,
  onBrowseProject,
  onToggleFavorite,
  onRemoveProject,
}: IntelligenceWelcomeProps) {
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [analysisPack, setAnalysisPack] = useState("general-v1")
  const [creating, setCreating] = useState(false)

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return [...projects]
      .filter((project) =>
        normalizedQuery
          ? `${project.name} ${project.path}`.toLowerCase().includes(normalizedQuery)
          : true,
      )
      .sort((left, right) => {
        if (left.favorite !== right.favorite) return left.favorite ? -1 : 1
        return new Date(right.lastOpenedAt).getTime() - new Date(left.lastOpenedAt).getTime()
      })
  }, [projects, query])

  async function submitProject() {
    if (!name.trim()) return
    setCreating(true)
    try {
      await onCreateProject(name.trim(), analysisPack)
      setDialogOpen(false)
      setName("")
      setAnalysisPack("general-v1")
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="slate-home min-h-screen bg-background text-foreground">
      <div className="app-drag-region fixed inset-x-0 top-0 z-20 h-10" />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-8 pb-12 pt-20">
        <header className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              <span className="h-px w-8 bg-primary" />
              Document evolution, made legible
            </div>
            <h1 className="max-w-3xl font-heading text-4xl font-medium leading-tight md:text-6xl">
              Every revision leaves evidence.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Import immutable versions, measure what changed, and keep the history of a
              document in one calm workspace.
            </p>
          </div>
          <div className="app-no-drag flex gap-2">
            <Button variant="outline" onClick={onBrowseProject}>
              <FolderOpen className="size-4" />
              Open Project
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              New Project
            </Button>
          </div>
        </header>

        <section className="mt-9 flex min-h-0 flex-1 flex-col">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Projects</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                One document, one version timeline.
              </p>
            </div>
            <label className="relative block w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects"
                className="pl-9"
              />
            </label>
          </div>

          {error && (
            <div role="alert" className="mb-4 border-l-2 border-destructive bg-card px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-hidden border-y border-border">
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading projects...</div>
            ) : visibleProjects.length === 0 ? (
              <div className="grid min-h-64 place-items-center py-12 text-center">
                <div>
                  <FileClock className="mx-auto size-7 text-primary" />
                  <h3 className="mt-4 font-heading text-lg">No timelines yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create a project, then import its first document version.
                  </p>
                </div>
              </div>
            ) : (
              visibleProjects.map((project, index) => (
                <article
                  key={project.path}
                  className={`group grid grid-cols-[auto_1fr_auto] items-center gap-5 px-2 py-5 ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <button
                    type="button"
                    className="rounded-sm p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => onToggleFavorite(project.path)}
                    aria-label={project.favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={`size-4 ${project.favorite ? "fill-primary text-primary" : ""}`} />
                  </button>
                  <button
                    type="button"
                    className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => onOpenProject(project)}
                  >
                    <h3 className="truncate text-sm font-semibold">{project.name}</h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Opened {formatDistanceToNow(new Date(project.lastOpenedAt), { addSuffix: true })}
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onOpenProject(project)}>
                      Open
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRemoveProject(project.path)}
                      aria-label={`Remove ${project.name} from recents`}
                      title="Remove from recents"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-md border border-border bg-popover shadow-xl">
          <DialogHeader>
            <DialogTitle>New document timeline</DialogTitle>
            <DialogDescription>
              Choose a folder after naming the project. Slate will create a portable project there.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Quarterly report"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Analysis pack</Label>
              <Select value={analysisPack} onValueChange={setAnalysisPack}>
                <SelectTrigger className="w-full rounded-md bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md bg-popover">
                  {ANALYSIS_PACKS.map((pack) => (
                    <SelectItem key={pack.id} value={pack.id} className="rounded-sm">
                      {pack.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                {ANALYSIS_PACKS.find((pack) => pack.id === analysisPack)?.description}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={submitProject} disabled={!name.trim() || creating}>
              {creating ? "Creating..." : "Choose Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
