import type {
  AnalysisPackId,
  AnalysisRun,
  DocumentVersion,
  IntelligenceProject,
  NormalizedDocument,
  VersionComparison,
} from "../../electron/shared/types"
import { getSlateApi } from "@/lib/slateApi"

export const ANALYSIS_PACKS = [
  {
    id: "general-v1",
    name: "General Document",
    description: "Structure, language, repetition, and readability.",
  },
  {
    id: "resume-v1",
    name: "Resume",
    description: "Sections, bullets, evidence, and content density.",
  },
  {
    id: "screenplay-v1",
    name: "Screenplay",
    description: "Scenes, characters, pacing, and dialogue balance.",
  },
] as const

export function createIntelligenceProject(
  path: string,
  name: string,
  analysisPack: AnalysisPackId,
): Promise<IntelligenceProject> {
  return getSlateApi().intelligence.createProject({ path, name, analysisPack })
}

export function openIntelligenceProject(path: string): Promise<IntelligenceProject> {
  return getSlateApi().intelligence.openProject(path)
}

export function setProjectAnalysisPack(
  projectPath: string,
  analysisPack: AnalysisPackId,
): Promise<IntelligenceProject> {
  return getSlateApi().intelligence.setAnalysisPack(projectPath, analysisPack)
}

export function listDocumentVersions(projectPath: string): Promise<DocumentVersion[]> {
  return getSlateApi().intelligence.listVersions(projectPath)
}

export function importDocumentVersion(input: {
  requestId: string
  projectPath: string
  sourcePath: string
  note?: string
}): Promise<{ version: DocumentVersion; analysis: AnalysisRun }> {
  return getSlateApi().intelligence.importVersion(input)
}

export function getNormalizedDocument(
  projectPath: string,
  versionId: string,
): Promise<NormalizedDocument> {
  return getSlateApi().intelligence.getDocument(projectPath, versionId)
}

export function getDocumentAsset(projectPath: string, versionId: string): Promise<Uint8Array> {
  return getSlateApi().intelligence.getDocumentAsset(projectPath, versionId)
}

export function getDocumentAnalysis(
  projectPath: string,
  versionId: string,
  analysisPack: string,
): Promise<AnalysisRun> {
  return getSlateApi().intelligence.getAnalysis(projectPath, versionId, analysisPack)
}

export function compareDocumentVersions(
  projectPath: string,
  baseVersionId: string,
  targetVersionId: string,
): Promise<VersionComparison> {
  return getSlateApi().intelligence.compareVersions(
    projectPath,
    baseVersionId,
    targetVersionId,
  )
}
