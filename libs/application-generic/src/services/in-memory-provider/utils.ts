export function isClusterModeEnabled(): boolean {
  return (
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED === 'true' ||
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED === 'true' ||
    false
  );
}
