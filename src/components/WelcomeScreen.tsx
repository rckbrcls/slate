import { useState, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-8 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Slate</h1>
          <p className="mt-2 text-muted-foreground">Screenplay Editor</p>
        </header>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={`mr-1.5 size-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
            Favorites
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDirection((d) => (d === "recent" ? "oldest" : "recent"))}
          >
            <ArrowUpDown className="mr-1.5 size-3.5" />
            {sortDirection === "recent" ? "Newest" : "Oldest"}
          </Button>
        </div>

        {/* Grid */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              Loading projects...
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleFavorite(project.path)
                            }}
                            className="ml-2 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Star
                              className={`size-4 ${project.favorite ? "fill-yellow-400 text-yellow-400" : ""}`}
                            />
                          </button>
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
