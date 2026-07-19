import { clearFromStorage, loadFromStorage, saveToStorage } from '@/utils/local-storage';

const LAST_SELECTED_CHANNEL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_DATA_KEY = 'integrationIdentifier';

function buildStorageKey(environmentId: string, agentIdentifier: string): string {
  return `nv_agent_last_channel_${environmentId}_${agentIdentifier}`;
}

export function saveLastSelectedChannel(
  environmentId: string | undefined,
  agentIdentifier: string,
  integrationIdentifier: string
): void {
  if (!environmentId) {
    return;
  }

  saveToStorage(buildStorageKey(environmentId, agentIdentifier), integrationIdentifier, STORAGE_DATA_KEY);
}

export function loadLastSelectedChannel(environmentId: string | undefined, agentIdentifier: string): string | null {
  if (!environmentId) {
    return null;
  }

  return loadFromStorage<string>(buildStorageKey(environmentId, agentIdentifier), STORAGE_DATA_KEY, {
    ttl: LAST_SELECTED_CHANNEL_TTL_MS,
  });
}

export function clearLastSelectedChannel(environmentId: string | undefined, agentIdentifier: string): void {
  if (!environmentId) {
    return;
  }

  clearFromStorage(buildStorageKey(environmentId, agentIdentifier), STORAGE_DATA_KEY);
}
