import { useCallback } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { useNavigate } from "@tanstack/react-router"
import { WelcomeScreen } from "@/components/WelcomeScreen"
import { useProjectStore, type ProjectEntry } from "@/hooks/useProjectStore"
import { writeEditorSession } from "@/lib/editorSession"

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
    const selected = await open({ directory: true, multiple: false })
    if (!selected) return

    const dirPath = typeof selected === "string" ? selected : selected[0]
    if (!dirPath) return

    await projectStore.addProject(dirPath)
    writeEditorSession({
      activeProjectDir: dirPath,
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
