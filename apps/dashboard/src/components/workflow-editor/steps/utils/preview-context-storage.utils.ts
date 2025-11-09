import { ContextPayload, WorkflowResponseDto } from '@novu/shared';
import { clearFromStorage, loadFromStorage, saveToStorage } from '@/utils/local-storage';
import { ParsedData, PayloadData, PreviewSubscriberData } from '../types/preview-context.types';

export type PersistedPreviewData = {
  data: ParsedData;
  timestamp: number;
  version: string;
};

const TTL_DAYS = 90;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

export function getPayloadStorageKey(workflowId: string, environmentId: string): string {
  return `preview-payload-${workflowId}-${environmentId}`;
}

export function getSubscriberStorageKey(workflowId: string, environmentId: string): string {
  return `preview-subscriber-${workflowId}-${environmentId}`;
}

export function getContextStorageKey(workflowId: string, environmentId: string): string {
  return `preview-context-data-${workflowId}-${environmentId}`;
}

export function savePayloadData(workflowId: string, environmentId: string, payload: PayloadData): void {
  const storageKey = getPayloadStorageKey(workflowId, environmentId);
  saveToStorage(storageKey, payload, 'payload');
}

export function saveSubscriberData(workflowId: string, environmentId: string, subscriber: PreviewSubscriberData): void {
  const storageKey = getSubscriberStorageKey(workflowId, environmentId);
  saveToStorage(storageKey, subscriber, 'subscriber');
}

export function saveContextData(workflowId: string, environmentId: string, context: ContextPayload): void {
  const storageKey = getContextStorageKey(workflowId, environmentId);
  saveToStorage(storageKey, context, 'context');
}

export function loadPayloadData(workflowId: string, environmentId: string): PayloadData | null {
  const storageKey = getPayloadStorageKey(workflowId, environmentId);
  return loadFromStorage<PayloadData>(storageKey, 'payload');
}

export function loadSubscriberData(workflowId: string, environmentId: string): PreviewSubscriberData | null {
  const storageKey = getSubscriberStorageKey(workflowId, environmentId);
  return loadFromStorage<PreviewSubscriberData>(storageKey, 'subscriber');
}

export function loadContextData(workflowId: string, environmentId: string): ContextPayload | null {
  const storageKey = getContextStorageKey(workflowId, environmentId);
  return loadFromStorage<ContextPayload>(storageKey, 'context');
}

export function mergePreviewContextData(persistedData: ParsedData, serverDefaults: ParsedData): ParsedData {
  return {
    payload: mergeObjectData(persistedData.payload, serverDefaults.payload),
    subscriber: mergeObjectData(persistedData.subscriber, serverDefaults.subscriber),
    steps: mergeObjectData(persistedData.steps, serverDefaults.steps),
    context: mergeObjectData(persistedData.context, serverDefaults.context),
  };
}

export function mergeObjectData<T extends Record<string, unknown>>(persisted: T, serverDefault: T): T {
  if (!persisted || typeof persisted !== 'object') {
    return serverDefault || ({} as T);
  }

  if (!serverDefault || typeof serverDefault !== 'object') {
    return persisted || ({} as T);
  }

  const merged = { ...serverDefault } as Record<string, unknown>;

  for (const key of Object.keys(persisted)) {
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
  }

  return merged as T;
}

export function clearPayloadData(workflowId: string, environmentId: string): void {
  const storageKey = getPayloadStorageKey(workflowId, environmentId);
  clearFromStorage(storageKey, 'payload data');
}

export function clearSubscriberData(workflowId: string, environmentId: string): void {
  const storageKey = getSubscriberStorageKey(workflowId, environmentId);
  clearFromStorage(storageKey, 'subscriber data');
}

export function clearContextData(workflowId: string, environmentId: string): void {
  const storageKey = getContextStorageKey(workflowId, environmentId);
  clearFromStorage(storageKey, 'context data');
}

export function cleanupExpiredPreviewData(): void {
  try {
    const keysToRemove: string[] = [];
    const prefixes = ['preview-context-data-', 'preview-payload-', 'preview-subscriber-'];

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

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Failed to cleanup expired preview data:', error);
  }
}

/**
 * Helper function to get initial payload with smart merging logic
 * Prioritizes: persisted data > server example > empty object
 */
export function getInitialPayload(
  workflowId: string,
  environmentId: string,
  workflow?: WorkflowResponseDto,
  isPayloadSchemaEnabled?: boolean
): PayloadData {
  // Get the server's payload example (the source of truth for schema)
  const serverPayloadExample =
    isPayloadSchemaEnabled && workflow?.payloadExample ? (workflow.payloadExample as PayloadData) : {};

  // Get persisted payload from localStorage
  const persistedPayload = loadPayloadData(workflowId, environmentId);

  // If no persisted payload, use server example
  if (!persistedPayload || Object.keys(persistedPayload).length === 0) {
    return serverPayloadExample;
  }

  // If no server example, use persisted (fallback for older workflows)
  if (!serverPayloadExample || Object.keys(serverPayloadExample).length === 0) {
    return persistedPayload;
  }

  // Merge persisted payload with server example
  // This ensures new schema keys are included while preserving user modifications
  return mergeObjectData(persistedPayload, serverPayloadExample);
}

/**
 * Helper function to get initial subscriber with fallback to current user
 * Prioritizes: persisted data > current user data > null
 */
export function getInitialSubscriber(
  workflowId: string,
  environmentId: string,
  currentUser?: { _id: string; firstName?: string; lastName?: string; email?: string }
): PreviewSubscriberData | null {
  const persistedSubscriber = loadSubscriberData(workflowId, environmentId);

  if (persistedSubscriber && Object.keys(persistedSubscriber).length > 0) {
    return persistedSubscriber;
  }

  if (currentUser) {
    return {
      subscriberId: currentUser._id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
    };
  }

  return null;
}

/**
 * Helper function to get initial context from storage
 */
export function getInitialContext(workflowId: string, environmentId: string): ContextPayload | null {
  return loadContextData(workflowId, environmentId);
}
