export function isClusterModeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (
    env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED === 'true' || env.IN_MEMORY_CLUSTER_MODE_ENABLED === 'true'
  );
}
