import { useCallback, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { IntelligenceWelcome } from "@/components/IntelligenceWelcome"
import { useProjectStore, type ProjectEntry } from "@/hooks/useProjectStore"
import { openProjectDirectory } from "@/lib/fileService"
import { createIntelligenceProject, openIntelligenceProject } from "@/lib/intelligenceApi"
import { writeIntelligenceSession } from "@/lib/intelligenceSession"

export function WelcomeRoute() {
  const navigate = useNavigate()
  const projectStore = useProjectStore()
  const [error, setError] = useState<string | null>(null)

  const handleOpenProject = useCallback(async (project: ProjectEntry) => {
    try {
      setError(null)
      const openedProject = await openIntelligenceProject(project.path)
      writeIntelligenceSession({ projectPath: project.path })
      await projectStore.addProject(project.path, openedProject.name)
      navigate({ to: "/project" })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [navigate, projectStore])

  const handleOpenFolder = useCallback(async () => {
    const result = await openProjectDirectory()
    if (!result.ok) return
    try {
      setError(null)
      const openedProject = await openIntelligenceProject(result.data)
      await projectStore.addProject(result.data, openedProject.name)
      writeIntelligenceSession({ projectPath: result.data })
      navigate({ to: "/project" })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [navigate, projectStore])

  const handleNewProject = useCallback(async (name: string, analysisPack: string) => {
    const result = await openProjectDirectory()
    if (!result.ok) return
    try {
      setError(null)
      const project = await createIntelligenceProject(result.data, name, analysisPack)
      await projectStore.addProject(result.data, project.name)
      writeIntelligenceSession({ projectPath: result.data })
      navigate({ to: "/project" })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [navigate, projectStore])

  return (
    <IntelligenceWelcome
      projects={projectStore.projects}
      loading={projectStore.loading}
      error={error}
      onCreateProject={handleNewProject}
      onOpenProject={handleOpenProject}
      onBrowseProject={handleOpenFolder}
      onToggleFavorite={projectStore.toggleFavorite}
      onRemoveProject={projectStore.removeProject}
    />
  )
}
