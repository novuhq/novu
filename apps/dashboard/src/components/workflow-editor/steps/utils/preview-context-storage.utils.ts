import { clearFromStorage, loadFromStorage, saveToStorage } from '@/utils/local-storage';
import { ParsedData, PayloadData, PreviewSubscriberData } from '../types/preview-context.types';

export type PersistedPreviewData = {
  data: ParsedData;
  timestamp: number;
  version: string;
};

const TTL_DAYS = 90;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

export function getStorageKey(workflowId: string, stepId: string, environmentId: string): string {
  return `preview-context-${workflowId}-${stepId}-${environmentId}`;
}

export function getPayloadStorageKey(workflowId: string, environmentId: string): string {
  return `preview-payload-${workflowId}-${environmentId}`;
}

export function getSubscriberStorageKey(workflowId: string, environmentId: string): string {
  return `preview-subscriber-${workflowId}-${environmentId}`;
}

export function savePreviewContextData(
  workflowId: string,
  stepId: string,
  environmentId: string,
  data: ParsedData
): void {
  const storageKey = getStorageKey(workflowId, stepId, environmentId);
  saveToStorage(storageKey, data, 'data');
}

export function savePayloadData(workflowId: string, environmentId: string, payload: PayloadData): void {
  const storageKey = getPayloadStorageKey(workflowId, environmentId);
  saveToStorage(storageKey, payload, 'payload');
}

export function saveSubscriberData(workflowId: string, environmentId: string, subscriber: PreviewSubscriberData): void {
  const storageKey = getSubscriberStorageKey(workflowId, environmentId);
  saveToStorage(storageKey, subscriber, 'subscriber');
}

export function loadPayloadData(workflowId: string, environmentId: string): PayloadData | null {
  const storageKey = getPayloadStorageKey(workflowId, environmentId);
  return loadFromStorage<PayloadData>(storageKey, 'payload');
}

export function loadSubscriberData(workflowId: string, environmentId: string): PreviewSubscriberData | null {
  const storageKey = getSubscriberStorageKey(workflowId, environmentId);
  return loadFromStorage<PreviewSubscriberData>(storageKey, 'subscriber');
}

export function loadPreviewContextData(workflowId: string, stepId: string, environmentId: string): ParsedData | null {
  const storageKey = getStorageKey(workflowId, stepId, environmentId);
  return loadFromStorage<ParsedData>(storageKey, 'data');
}

export function mergePreviewContextData(persistedData: ParsedData, serverDefaults: ParsedData): ParsedData {
  return {
    payload: mergeObjectData(persistedData.payload, serverDefaults.payload),
    subscriber: mergeObjectData(persistedData.subscriber, serverDefaults.subscriber),
    steps: mergeObjectData(persistedData.steps, serverDefaults.steps),
  };
}

export function mergeObjectData<T extends Record<string, unknown>>(persisted: T, serverDefault: T): T {
  if (!persisted || typeof persisted !== 'object') {
    return serverDefault || ({} as T);
  }

  if (!serverDefault || typeof serverDefault !== 'object') {
    return serverDefault || ({} as T);
  }

  const merged = { ...serverDefault } as Record<string, unknown>;

  Object.keys(persisted).forEach((key) => {
    if (key in serverDefault) {
      const isNestedObject =
        typeof serverDefault[key] === 'object' &&
        typeof persisted[key] === 'object' &&
        serverDefault[key] !== null &&
        persisted[key] !== null &&
        !Array.isArray(serverDefault[key]) &&
        !Array.isArray(persisted[key]);

      merged[key] = isNestedObject
        ? mergeObjectData(persisted[key] as Record<string, unknown>, serverDefault[key] as Record<string, unknown>)
        : persisted[key];
    }
  });

  return merged as T;
}

export function clearPreviewContextData(workflowId: string, stepId: string, environmentId: string): void {
  const storageKey = getStorageKey(workflowId, stepId, environmentId);
  clearFromStorage(storageKey, 'preview context data');
}

export function clearPayloadData(workflowId: string, environmentId: string): void {
  const storageKey = getPayloadStorageKey(workflowId, environmentId);
  clearFromStorage(storageKey, 'payload data');
}

export function clearSubscriberData(workflowId: string, environmentId: string): void {
  const storageKey = getSubscriberStorageKey(workflowId, environmentId);
  clearFromStorage(storageKey, 'subscriber data');
}

export function cleanupExpiredPreviewData(): void {
  try {
    const keysToRemove: string[] = [];
    const prefixes = ['preview-context-', 'preview-payload-', 'preview-subscriber-'];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
        try {
          const stored = localStorage.getItem(key);

          if (stored) {
            const persistedData = JSON.parse(stored);
            const isExpired = Date.now() - persistedData.timestamp > TTL_MS;

            if (isExpired) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to cleanup expired preview data:', error);
  }
}
