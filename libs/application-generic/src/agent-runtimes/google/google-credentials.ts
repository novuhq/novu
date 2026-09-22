export type ResolvedGeminiCredentials = {
  projectId: string;
  location: string;
  engineId: string;
  quotaProjectId: string;
  /** Registered agent within the engine (Discovery Engine console → App → Agents). Optional. */
  agentId?: string;
};

export function resolveGeminiCredentials(credentials: Record<string, unknown>): ResolvedGeminiCredentials | null {
  const projectId = (credentials.projectName as string | undefined)?.trim();
  const engineId = (credentials.instanceId as string | undefined)?.trim();

  if (!projectId || !engineId) {
    return null;
  }

  const location = (credentials.region as string | undefined)?.trim() || 'global';
  const agentId = (credentials.agentId as string | undefined)?.trim() || undefined;

  return { projectId, location, engineId, quotaProjectId: projectId, ...(agentId ? { agentId } : {}) };
}
