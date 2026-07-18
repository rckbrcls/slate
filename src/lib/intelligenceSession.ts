const INTELLIGENCE_SESSION_KEY = "slate-intelligence-session-v1"

export interface IntelligenceSession {
  projectPath: string
}

export function readIntelligenceSession(): IntelligenceSession | null {
  try {
    const raw = window.sessionStorage.getItem(INTELLIGENCE_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("projectPath" in parsed) ||
      typeof parsed.projectPath !== "string"
    ) {
      return null
    }
    return { projectPath: parsed.projectPath }
  } catch {
    return null
  }
}

export function writeIntelligenceSession(session: IntelligenceSession) {
  window.sessionStorage.setItem(INTELLIGENCE_SESSION_KEY, JSON.stringify(session))
}

export function clearIntelligenceSession() {
  window.sessionStorage.removeItem(INTELLIGENCE_SESSION_KEY)
}
