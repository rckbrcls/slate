import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import { WelcomeScreen } from "@/components/WelcomeScreen"
import { useProjectStore, type ProjectEntry } from "@/hooks/useProjectStore"
import { writeEditorSession } from "@/lib/editorSession"
import { openProjectDirectory } from "@/lib/fileService"

export function WelcomeRoute() {
  const navigate = useNavigate()
  const projectStore = useProjectStore()

  const handleOpenProject = useCallback(async (project: ProjectEntry) => {
    writeEditorSession({
      activeProjectDir: project.path,
      filePath: project.lastFile,
    })
    await projectStore.touchProject(project.path)
    navigate({ to: "/editor" })
  }, [navigate, projectStore])

  const handleOpenFolder = useCallback(async () => {
    const result = await openProjectDirectory()
    if (!result.ok) return

    await projectStore.addProject(result.data)
    writeEditorSession({
      activeProjectDir: result.data,
      filePath: null,
    })
    navigate({ to: "/editor" })
  }, [navigate, projectStore])

  return (
    <WelcomeScreen
      projects={projectStore.projects}
      loading={projectStore.loading}
      onOpenProject={handleOpenProject}
      onOpenFolder={handleOpenFolder}
      onRemoveProject={projectStore.removeProject}
      onToggleFavorite={projectStore.toggleFavorite}
    />
  )
}
