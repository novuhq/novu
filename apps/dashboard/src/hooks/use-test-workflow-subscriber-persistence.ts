import { type ISubscriberResponseDto } from '@novu/shared';
import { useCallback } from 'react';
import { clearFromStorage, loadFromStorage, saveToStorage } from '@/utils/local-storage';

type UseTestWorkflowSubscriberPersistenceProps = {
  workflowId: string;
  environmentId: string;
};

type PersistedSubscriberData = {
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  data?: Record<string, unknown>;
};

function getTestWorkflowSubscriberStorageKey(workflowId: string, environmentId: string): string {
  return `test-workflow-subscriber-${workflowId}-${environmentId}`;
}

export function useTestWorkflowSubscriberPersistence({
  workflowId,
  environmentId,
}: UseTestWorkflowSubscriberPersistenceProps) {
  const loadPersistedSubscriber = useCallback((): PersistedSubscriberData | null => {
    if (!workflowId || !environmentId) return null;

    const storageKey = getTestWorkflowSubscriberStorageKey(workflowId, environmentId);
    return loadFromStorage<PersistedSubscriberData>(storageKey, 'subscriber');
  }, [workflowId, environmentId]);

  const savePersistedSubscriber = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      if (!workflowId || !environmentId) return;

      const subscriberData: PersistedSubscriberData = {
        subscriberId: subscriber.subscriberId,
        firstName: subscriber.firstName ?? undefined,
        lastName: subscriber.lastName ?? undefined,
        email: subscriber.email ?? undefined,
        phone: subscriber.phone ?? undefined,
        avatar: subscriber.avatar ?? undefined,
        locale: subscriber.locale ?? undefined,
        timezone: subscriber.timezone ?? undefined,
        data: subscriber.data ?? undefined,
      };

      const storageKey = getTestWorkflowSubscriberStorageKey(workflowId, environmentId);
      saveToStorage(storageKey, subscriberData, 'subscriber');
    },
    [workflowId, environmentId]
  );

  const clearPersistedSubscriber = useCallback(() => {
    if (!workflowId || !environmentId) return;

    const storageKey = getTestWorkflowSubscriberStorageKey(workflowId, environmentId);
    clearFromStorage(storageKey, 'subscriber');
  }, [workflowId, environmentId]);

  return {
    loadPersistedSubscriber,
    savePersistedSubscriber,
    clearPersistedSubscriber,
  };
}
