import { ParsedData } from '../types/preview-context.types';

export type PersistedPreviewData = {
  data: ParsedData;
  timestamp: number;
  version: string;
};

const STORAGE_VERSION = '1.0.0';
const TTL_DAYS = 90;

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
  try {
    const storageKey = getStorageKey(workflowId, stepId, environmentId);
    const persistedData: PersistedPreviewData = {
      data,
      timestamp: Date.now(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(storageKey, JSON.stringify(persistedData));
  } catch (error) {
    console.warn('Failed to save preview context data to localStorage:', error);
  }
}

export function savePayloadData(workflowId: string, environmentId: string, payload: any): void {
  try {
    const storageKey = getPayloadStorageKey(workflowId, environmentId);
    const persistedData = {
      payload,
      timestamp: Date.now(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(storageKey, JSON.stringify(persistedData));
  } catch (error) {
    console.warn('Failed to save payload data to localStorage:', error);
  }
}

export function saveSubscriberData(workflowId: string, environmentId: string, subscriber: any): void {
  try {
    const storageKey = getSubscriberStorageKey(workflowId, environmentId);
    const persistedData = {
      subscriber,
      timestamp: Date.now(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(storageKey, JSON.stringify(persistedData));
  } catch (error) {
    console.warn('Failed to save subscriber data to localStorage:', error);
  }
}

export function loadPayloadData(workflowId: string, environmentId: string): any | null {
  try {
    const storageKey = getPayloadStorageKey(workflowId, environmentId);
    const stored = localStorage.getItem(storageKey);

    if (!stored) return null;

    const persistedData = JSON.parse(stored);

    // Check TTL
    const isExpired = Date.now() - persistedData.timestamp > TTL_DAYS * 24 * 60 * 60 * 1000;

    if (isExpired) {
      localStorage.removeItem(storageKey);
      return null;
    }

    // Version check for future migrations
    if (persistedData.version !== STORAGE_VERSION) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return persistedData.payload;
  } catch (error) {
    console.warn('Failed to load payload data from localStorage:', error);
    return null;
  }
}

export function loadSubscriberData(workflowId: string, environmentId: string): any | null {
  try {
    const storageKey = getSubscriberStorageKey(workflowId, environmentId);
    const stored = localStorage.getItem(storageKey);

    if (!stored) return null;

    const persistedData = JSON.parse(stored);

    // Check TTL
    const isExpired = Date.now() - persistedData.timestamp > TTL_DAYS * 24 * 60 * 60 * 1000;

    if (isExpired) {
      localStorage.removeItem(storageKey);
      return null;
    }

    // Version check for future migrations
    if (persistedData.version !== STORAGE_VERSION) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return persistedData.subscriber;
  } catch (error) {
    console.warn('Failed to load subscriber data from localStorage:', error);
    return null;
  }
}

export function loadPreviewContextData(workflowId: string, stepId: string, environmentId: string): ParsedData | null {
  try {
    const storageKey = getStorageKey(workflowId, stepId, environmentId);
    const stored = localStorage.getItem(storageKey);

    if (!stored) return null;

    const persistedData: PersistedPreviewData = JSON.parse(stored);

    // Check TTL
    const isExpired = Date.now() - persistedData.timestamp > TTL_DAYS * 24 * 60 * 60 * 1000;

    if (isExpired) {
      localStorage.removeItem(storageKey);
      return null;
    }

    // Version check for future migrations
    if (persistedData.version !== STORAGE_VERSION) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return persistedData.data;
  } catch (error) {
    console.warn('Failed to load preview context data from localStorage:', error);
    return null;
  }
}

export function mergePreviewContextData(
  persistedData: ParsedData,
  serverDefaults: ParsedData,
  workflowSchema?: any
): ParsedData {
  const merged: ParsedData = {
    payload: mergePayloadData(persistedData.payload, serverDefaults.payload),
    subscriber: mergeObjectData(persistedData.subscriber, serverDefaults.subscriber),
    steps: mergeObjectData(persistedData.steps, serverDefaults.steps),
  };

  return merged;
}

function mergePayloadData(persisted: any, serverDefault: any): any {
  if (!persisted || typeof persisted !== 'object') {
    return serverDefault || {};
  }

  if (!serverDefault || typeof serverDefault !== 'object') {
    return serverDefault || {};
  }

  // Start with server defaults to ensure structure is correct
  const merged = { ...serverDefault };

  // Overlay persisted values for existing keys only
  Object.keys(persisted).forEach((key) => {
    if (key in serverDefault) {
      if (
        typeof serverDefault[key] === 'object' &&
        typeof persisted[key] === 'object' &&
        serverDefault[key] !== null &&
        persisted[key] !== null &&
        !Array.isArray(serverDefault[key]) &&
        !Array.isArray(persisted[key])
      ) {
        merged[key] = mergePayloadData(persisted[key], serverDefault[key]);
      } else {
        merged[key] = persisted[key];
      }
    }
  });

  return merged;
}

function mergeObjectData(persisted: any, serverDefault: any): any {
  if (!persisted || typeof persisted !== 'object') {
    return serverDefault || {};
  }

  if (!serverDefault || typeof serverDefault !== 'object') {
    return serverDefault || {};
  }

  // Start with server defaults to ensure structure is correct
  const merged = { ...serverDefault };

  // Overlay persisted values for existing keys only
  Object.keys(persisted).forEach((key) => {
    if (key in serverDefault) {
      if (
        typeof serverDefault[key] === 'object' &&
        typeof persisted[key] === 'object' &&
        serverDefault[key] !== null &&
        persisted[key] !== null &&
        !Array.isArray(serverDefault[key]) &&
        !Array.isArray(persisted[key])
      ) {
        merged[key] = mergeObjectData(persisted[key], serverDefault[key]);
      } else {
        merged[key] = persisted[key];
      }
    }
  });

  return merged;
}

export function clearPreviewContextData(workflowId: string, stepId: string, environmentId: string): void {
  try {
    const storageKey = getStorageKey(workflowId, stepId, environmentId);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to clear preview context data from localStorage:', error);
  }
}

export function clearPayloadData(workflowId: string, environmentId: string): void {
  try {
    const storageKey = getPayloadStorageKey(workflowId, environmentId);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to clear payload data from localStorage:', error);
  }
}

export function clearSubscriberData(workflowId: string, environmentId: string): void {
  try {
    const storageKey = getSubscriberStorageKey(workflowId, environmentId);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to clear subscriber data from localStorage:', error);
  }
}

export function cleanupExpiredPreviewData(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (
        key?.startsWith('preview-context-') ||
        key?.startsWith('preview-payload-') ||
        key?.startsWith('preview-subscriber-')
      ) {
        try {
          const stored = localStorage.getItem(key);

          if (stored) {
            const persistedData = JSON.parse(stored);
            const isExpired = Date.now() - persistedData.timestamp > TTL_DAYS * 24 * 60 * 60 * 1000;

            if (isExpired) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid data, mark for removal
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to cleanup expired preview data:', error);
  }
}
