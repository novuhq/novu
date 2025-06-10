import { ParsedData } from '../types/preview-context.types';

export type PersistedPreviewData = {
  data: ParsedData;
  timestamp: number;
  version: string;
};

type PersistedGenericData = {
  [key: string]: any;
  timestamp: number;
  version: string;
};

const STORAGE_VERSION = '1.0.0';
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

function saveToStorage(storageKey: string, data: any, dataKey: string): void {
  try {
    const persistedData = {
      [dataKey]: data,
      timestamp: Date.now(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(storageKey, JSON.stringify(persistedData));
  } catch (error) {
    console.warn(`Failed to save ${dataKey} to localStorage:`, error);
  }
}

function loadFromStorage(storageKey: string, dataKey: string): any | null {
  try {
    const stored = localStorage.getItem(storageKey);

    if (!stored) return null;

    const persistedData: PersistedGenericData = JSON.parse(stored);

    const isExpired = Date.now() - persistedData.timestamp > TTL_MS;

    if (isExpired || persistedData.version !== STORAGE_VERSION) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return persistedData[dataKey];
  } catch (error) {
    console.warn(`Failed to load ${dataKey} from localStorage:`, error);
    return null;
  }
}

function clearFromStorage(storageKey: string, dataKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn(`Failed to clear ${dataKey} from localStorage:`, error);
  }
}

export function savePreviewContextData(
  workflowId: string,
  stepId: string,
  environmentId: string,
  data: ParsedData
): void {
  const storageKey = getStorageKey(workflowId, stepId, environmentId);
  const persistedData: PersistedPreviewData = {
    data,
    timestamp: Date.now(),
    version: STORAGE_VERSION,
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(persistedData));
  } catch (error) {
    console.warn('Failed to save preview context data to localStorage:', error);
  }
}

export function savePayloadData(workflowId: string, environmentId: string, payload: any): void {
  const storageKey = getPayloadStorageKey(workflowId, environmentId);
  saveToStorage(storageKey, payload, 'payload');
}

export function saveSubscriberData(workflowId: string, environmentId: string, subscriber: any): void {
  const storageKey = getSubscriberStorageKey(workflowId, environmentId);
  saveToStorage(storageKey, subscriber, 'subscriber');
}

export function loadPayloadData(workflowId: string, environmentId: string): any | null {
  const storageKey = getPayloadStorageKey(workflowId, environmentId);
  return loadFromStorage(storageKey, 'payload');
}

export function loadSubscriberData(workflowId: string, environmentId: string): any | null {
  const storageKey = getSubscriberStorageKey(workflowId, environmentId);
  return loadFromStorage(storageKey, 'subscriber');
}

export function loadPreviewContextData(workflowId: string, stepId: string, environmentId: string): ParsedData | null {
  try {
    const storageKey = getStorageKey(workflowId, stepId, environmentId);
    const stored = localStorage.getItem(storageKey);

    if (!stored) return null;

    const persistedData: PersistedPreviewData = JSON.parse(stored);

    const isExpired = Date.now() - persistedData.timestamp > TTL_MS;

    if (isExpired || persistedData.version !== STORAGE_VERSION) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return persistedData.data;
  } catch (error) {
    console.warn('Failed to load preview context data from localStorage:', error);
    return null;
  }
}

export function mergePreviewContextData(persistedData: ParsedData, serverDefaults: ParsedData): ParsedData {
  return {
    payload: mergeObjectData(persistedData.payload, serverDefaults.payload),
    subscriber: mergeObjectData(persistedData.subscriber, serverDefaults.subscriber),
    steps: mergeObjectData(persistedData.steps, serverDefaults.steps),
  };
}

function mergeObjectData(persisted: any, serverDefault: any): any {
  if (!persisted || typeof persisted !== 'object') {
    return serverDefault || {};
  }

  if (!serverDefault || typeof serverDefault !== 'object') {
    return serverDefault || {};
  }

  const merged = { ...serverDefault };

  Object.keys(persisted).forEach((key) => {
    if (key in serverDefault) {
      const isNestedObject =
        typeof serverDefault[key] === 'object' &&
        typeof persisted[key] === 'object' &&
        serverDefault[key] !== null &&
        persisted[key] !== null &&
        !Array.isArray(serverDefault[key]) &&
        !Array.isArray(persisted[key]);

      merged[key] = isNestedObject ? mergeObjectData(persisted[key], serverDefault[key]) : persisted[key];
    }
  });

  return merged;
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
