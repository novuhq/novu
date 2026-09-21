export type ResolvedGeminiCredentials = {
  projectId: string;
  location: string;
  engineId: string;
  quotaProjectId: string;
};

export function resolveGeminiCredentials(credentials: Record<string, unknown>): ResolvedGeminiCredentials | null {
  const projectId = (credentials.projectName as string | undefined)?.trim();
  const engineId = (credentials.instanceId as string | undefined)?.trim();

  if (!projectId || !engineId) {
    return null;
  }

  const location = (credentials.region as string | undefined)?.trim() || 'global';

  return { projectId, location, engineId, quotaProjectId: projectId };
}
