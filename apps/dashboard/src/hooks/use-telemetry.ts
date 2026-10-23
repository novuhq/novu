import { useMutation } from '@tanstack/react-query';
// Default import. `import *` calls Mixpanel with the module namespace as `this`.
import mixpanel from 'mixpanel-browser';
import { useCallback } from 'react';
import { measure } from '@/api/telemetry';
import { IS_SELF_HOSTED, MIXPANEL_KEY } from '@/config';
import { readPersistedCliOnboardingSessionId } from '@/utils/cli-onboarding-identity';
import { TelemetryEvent } from '@/utils/telemetry';

export const useTelemetry = () => {
  const { mutate } = useMutation<void, unknown, { event: string; data?: Record<string, unknown> }>({
    mutationFn: ({ event, data }) => measure(event, data),
  });

  return useCallback(
    (event: TelemetryEvent, data?: Record<string, unknown>) => {
      if (IS_SELF_HOSTED) return;

      const mixpanelEnabled = !!MIXPANEL_KEY;
      const onboardingSessionId = readPersistedCliOnboardingSessionId();

      if (mixpanelEnabled) {
        let sessionReplayProperties: Record<string, unknown> = {};

        try {
          sessionReplayProperties =
            // @ts-expect-error missing from types
            mixpanel.get_session_recording_properties();
        } catch (error) {
          console.error(error);
        }

        data = {
          ...(data || {}),
          ...(onboardingSessionId ? { onboardingSessionId } : {}),
          ...sessionReplayProperties,
        };
      } else if (onboardingSessionId) {
        data = {
          ...(data || {}),
          onboardingSessionId,
        };
      }

      mutate({ event: `${event} - [DASHBOARD]`, data });
    },
    [mutate]
  );
};
