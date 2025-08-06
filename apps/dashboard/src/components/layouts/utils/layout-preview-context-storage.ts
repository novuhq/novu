import { SubscriberDto } from '@novu/shared';
import { clearFromStorage, loadFromStorage, saveToStorage } from '@/utils/local-storage';

export function getSubscriberStorageKey(layoutId: string, environmentId: string): string {
  return `layout-preview-subscriber-${layoutId}-${environmentId}`;
}

export function saveSubscriberData(layoutId: string, environmentId: string, subscriber: Partial<SubscriberDto>): void {
  const storageKey = getSubscriberStorageKey(layoutId, environmentId);
  saveToStorage(storageKey, subscriber, 'subscriber');
}

export function loadSubscriberData(workflowId: string, environmentId: string): Partial<SubscriberDto> | null {
  const storageKey = getSubscriberStorageKey(workflowId, environmentId);
  return loadFromStorage<Partial<SubscriberDto>>(storageKey, 'subscriber');
}

export function clearSubscriberData(layoutId: string, environmentId: string): void {
  const storageKey = getSubscriberStorageKey(layoutId, environmentId);
  clearFromStorage(storageKey, 'subscriber data');
}
