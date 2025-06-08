import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { getSubscribers } from '@/api/subscribers';
import { createSubscriberData } from '../utils/preview-context.utils';
import { ParsedData } from '../types/preview-context.types';

export function useSubscriberInitialization(
  localParsedData: ParsedData,
  updateJsonSection: (section: keyof ParsedData, data: any) => void,
  enabled: boolean = false
) {
  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const loadCurrentUserSubscriber = async () => {
      // Skip if already has subscriber data or missing required info
      if (
        !currentUser?.email ||
        !currentEnvironment ||
        Object.keys(localParsedData.subscriber).length > 0 ||
        hasInitializedRef.current
      ) {
        return;
      }

      try {
        const response = await getSubscribers({
          environment: currentEnvironment,
          email: currentUser.email,
          limit: 1,
        });

        if (response.data?.[0]) {
          hasInitializedRef.current = true;
          const subscriberData = createSubscriberData(response.data[0]);
          updateJsonSection('subscriber', subscriberData);
        }
      } catch {
        // Silently handle error - user might not have a subscriber record
      }
    };

    loadCurrentUserSubscriber();
  }, [currentUser?.email, currentEnvironment, localParsedData.subscriber, updateJsonSection, enabled]);
}
