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
  Star,
  Plus,
  FolderOpen,
  ArrowUpDown,
  FileText,
  Search,
  Trash2,
} from "lucide-react"
import type { ProjectEntry } from "@/hooks/useProjectStore"

interface WelcomeScreenProps {
  projects: ProjectEntry[]
  loading: boolean
  onOpenProject: (project: ProjectEntry) => void
  onOpenFolder: () => void
  onRemoveProject: (path: string) => void
  onToggleFavorite: (path: string) => void
}

export function WelcomeScreen({
  projects,
  loading,
  onOpenProject,
  onOpenFolder,
  onRemoveProject,
  onToggleFavorite,
}: WelcomeScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [sortDirection, setSortDirection] = useState<"recent" | "oldest">("recent")

  const filteredProjects = useMemo(() => {
    let result = projects

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }

    if (showFavoritesOnly) {
      result = result.filter((p) => p.favorite)
    }

    result = [...result].sort((a, b) => {
      const diff = new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
      return sortDirection === "recent" ? diff : -diff
    })

    return result
  }, [projects, searchQuery, showFavoritesOnly, sortDirection])

  return (
    <div className="relative flex h-screen flex-col bg-background text-foreground">
      <div className="app-drag-region absolute inset-x-0 top-0 h-10" />
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-8 py-16">
        <header className="mb-12 text-center">
          <h1 className="font-heading text-5xl font-medium text-foreground">Slate</h1>
          <p className="mt-2 text-sm text-muted-foreground">Screenplay Editor</p>
        </header>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-3">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <ButtonGroup className="shrink-0">
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star
                data-icon="inline-start"
                className={`size-3.5 ${showFavoritesOnly ? "fill-current" : ""}`}
              />
              Favorites
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDirection((d) => (d === "recent" ? "oldest" : "recent"))}
            >
              <ArrowUpDown data-icon="inline-start" className="size-3.5" />
              {sortDirection === "recent" ? "Newest" : "Oldest"}
            </Button>
          </ButtonGroup>
        </div>

        {/* Grid */}
        <ScrollArea className="-m-1 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              Loading projects...
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 p-1">
              {filteredProjects.map((project) => (
                <ContextMenu key={project.path}>
                  <ContextMenuTrigger>
                    <Card
                      className="group cursor-pointer transition-colors hover:bg-accent/50"
                      onClick={() => onOpenProject(project)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-medium">{project.name}</h3>
                            {project.lastFile && (
                              <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <FileText className="size-3 shrink-0" />
                                {project.lastFile.split("/").pop()}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(project.lastOpenedAt), { addSuffix: true })}
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

              {/* Open Folder card */}
              <Card
                className="cursor-pointer border-dashed transition-colors hover:bg-accent/50"
                onClick={onOpenFolder}
              >
                <CardContent className="flex flex-col items-center justify-center p-4 text-muted-foreground">
                  <div className="mb-2 rounded-full bg-muted p-3">
                    <Plus className="size-5" />
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <FolderOpen className="size-3.5" />
                    Open Folder
                  </span>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
