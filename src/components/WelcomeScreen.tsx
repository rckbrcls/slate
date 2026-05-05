import { useState, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Star,
  FolderOpen,
  ArrowUpDown,
  FileText,
  Search,
  Trash2,
  FilePlus,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from "lucide-react"
import type { ProjectEntry } from "@/hooks/useProjectStore"
import { cn } from "@/lib/utils"

type ViewMode = "cards" | "list"
type SortMode = "newest" | "oldest" | "name"
type FileTypeFilter = "all" | "fountain" | "spmd" | "none"
type ActivityFilter = "all" | "week" | "older"

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000

function getProjectFileName(project: ProjectEntry) {
  if (!project.lastFile) return "No recent file"
  return project.lastFile.split(/[\\/]/).pop() || project.lastFile
}

function getProjectExtension(project: ProjectEntry) {
  if (!project.lastFile) return null
  const fileName = getProjectFileName(project)
  return fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase() ?? null
    : null
}

function matchesFileType(project: ProjectEntry, filter: FileTypeFilter) {
  if (filter === "all") return true
  if (filter === "none") return !project.lastFile
  return getProjectExtension(project) === filter
}

function matchesActivity(project: ProjectEntry, filter: ActivityFilter, now: number) {
  if (filter === "all") return true

  const openedAt = new Date(project.lastOpenedAt).getTime()
  if (!Number.isFinite(openedAt)) return filter === "older"

  const isThisWeek = now - openedAt <= WEEK_IN_MS
  return filter === "week" ? isThisWeek : !isThisWeek
}

function getSortLabel(sortMode: SortMode) {
  switch (sortMode) {
    case "oldest":
      return "Oldest"
    case "name":
      return "Name"
    case "newest":
    default:
      return "Newest"
  }
}

interface WelcomeScreenProps {
  projects: ProjectEntry[]
  loading: boolean
  onNewProject: () => void
  onOpenProject: (project: ProjectEntry) => void
  onOpenFolder: () => void
  onRemoveProject: (path: string) => void
  onToggleFavorite: (path: string) => void
}

export function WelcomeScreen({
  projects,
  loading,
  onNewProject,
  onOpenProject,
  onOpenFolder,
  onRemoveProject,
  onToggleFavorite,
}: WelcomeScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>("all")
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("cards")

  const filteredProjects = useMemo(() => {
    let result = projects

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((project) => {
        const fileName = getProjectFileName(project).toLowerCase()
        return (
          project.name.toLowerCase().includes(q) ||
          fileName.includes(q) ||
          project.path.toLowerCase().includes(q)
        )
      })
    }

    if (showFavoritesOnly) {
      result = result.filter((p) => p.favorite)
    }

    result = result.filter((project) => matchesFileType(project, fileTypeFilter))

    const now = Date.now()
    result = result.filter((project) => matchesActivity(project, activityFilter, now))

    result = [...result].sort((a, b) => {
      if (sortMode === "name") {
        return a.name.localeCompare(b.name)
      }

      const diff = new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
      return sortMode === "newest" ? diff : -diff
    })

    return result
  }, [
    projects,
    searchQuery,
    showFavoritesOnly,
    sortMode,
    fileTypeFilter,
    activityFilter,
  ])

  const activeFilterCount =
    (fileTypeFilter === "all" ? 0 : 1) +
    (activityFilter === "all" ? 0 : 1)

  return (
    <div className="relative flex h-screen flex-col bg-background text-foreground">
      <div className="app-drag-region absolute inset-x-0 top-0 h-10" />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-8 py-16">
        <header className="mb-12 text-center">
          <h1 className="font-heading text-5xl font-medium text-foreground">Slate</h1>
          <p className="mt-2 text-sm text-muted-foreground">Screenplay Editor</p>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <InputGroup className="min-w-[260px] flex-1">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <Button
            variant="default"
            size="sm"
            onClick={onNewProject}
            className="shrink-0"
          >
            <FilePlus data-icon="inline-start" className="size-3.5" />
            New Project
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFolder}
            className="shrink-0"
          >
            <FolderOpen data-icon="inline-start" className="size-3.5" />
            Open Project
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <SlidersHorizontal data-icon="inline-start" className="size-3.5" />
                {activeFilterCount > 0 ? `${activeFilterCount} Filters` : "Filters"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>File Type</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={fileTypeFilter}
                onValueChange={(value) => setFileTypeFilter(value as FileTypeFilter)}
              >
                <DropdownMenuRadioItem value="all">All Projects</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="fountain">Fountain Files</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="spmd">SPMD Files</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="none">No Recent File</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Activity</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={activityFilter}
                onValueChange={(value) => setActivityFilter(value as ActivityFilter)}
              >
                <DropdownMenuRadioItem value="all">Any Time</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="week">Last 7 Days</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="older">Older Projects</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="shrink-0"
          >
            <Star
              data-icon="inline-start"
              className={`size-3.5 ${showFavoritesOnly ? "fill-current" : ""}`}
            />
            Favorites
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <ArrowUpDown data-icon="inline-start" className="size-3.5" />
                {getSortLabel(sortMode)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortMode}
                onValueChange={(value) => setSortMode(value as SortMode)}
              >
                <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <ButtonGroup className="shrink-0">
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid data-icon="inline-start" className="size-3.5" />
              Cards
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
            >
              <List data-icon="inline-start" className="size-3.5" />
              List
            </Button>
          </ButtonGroup>
        </div>

        <ScrollArea className="-m-1 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              Loading projects...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-border/60 bg-card/40 py-16 text-sm text-muted-foreground">
              No projects match these filters.
            </div>
          ) : (
            <div
              className={cn(
                "p-1",
                viewMode === "cards"
                  ? "grid w-full max-w-[900px] grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex w-full flex-col gap-1.5",
              )}
            >
              {filteredProjects.map((project) => (
                <ContextMenu key={project.path}>
                  <ContextMenuTrigger>
                    <Card
                      size="sm"
                      className={cn(
                        "group cursor-pointer rounded-lg py-2 transition-colors hover:bg-accent/50",
                        viewMode === "cards"
                          ? "min-h-[84px]"
                          : "min-h-[58px]",
                      )}
                      onClick={() => onOpenProject(project)}
                    >
                      <CardContent
                        className={cn(
                          "p-3",
                          viewMode === "list" &&
                            "flex items-center justify-between gap-4 py-2.5",
                        )}
                      >
                        <div
                          className={cn(
                            "flex min-w-0 items-start justify-between",
                            viewMode === "list" && "flex-1 items-center",
                          )}
                        >
                          <div
                            className={cn(
                              "min-w-0 flex-1",
                              viewMode === "list" &&
                                "grid gap-1 sm:grid-cols-[minmax(140px,1fr)_minmax(120px,0.9fr)_auto] sm:items-center sm:gap-4",
                            )}
                          >
                            <h3 className="truncate text-sm font-medium">
                              {project.name}
                            </h3>
                            <p
                              className={cn(
                                "flex items-center gap-1 truncate text-xs text-muted-foreground",
                                viewMode === "cards" ? "mt-1" : "mt-0",
                              )}
                            >
                              <FileText className="size-3 shrink-0" />
                              {getProjectFileName(project)}
                            </p>
                            <p
                              className={cn(
                                "text-xs text-muted-foreground",
                                viewMode === "cards" ? "mt-2" : "mt-0 sm:justify-self-end",
                              )}
                            >
                              {formatDistanceToNow(new Date(project.lastOpenedAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleFavorite(project.path)
                            }}
                            className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
                            title={project.favorite ? "Unfavorite" : "Favorite"}
                          >
                            <Star
                              className={`size-4 ${project.favorite ? "fill-current text-primary" : ""}`}
                            />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onToggleFavorite(project.path)}>
                      <Star className="mr-2 size-3.5" />
                      {project.favorite ? "Unfavorite" : "Favorite"}
                    </ContextMenuItem>
                    <ContextMenuItem
                      variant="destructive"
                      onClick={() => onRemoveProject(project.path)}
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      Remove
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
