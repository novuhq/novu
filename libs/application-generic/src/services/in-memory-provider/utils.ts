import { env } from '../../config/env';

export function isClusterModeEnabled(): boolean {
  return env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED;
}
