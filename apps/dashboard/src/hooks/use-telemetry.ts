import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as mixpanel from 'mixpanel-browser';
import { measure } from '@/api/telemetry';
import { MIXPANEL_KEY, IS_SELF_HOSTED } from '@/config';
import { TelemetryEvent } from '@/utils/telemetry';

export const useTelemetry = () => {
  const { mutate } = useMutation<void, unknown, { event: string; data?: Record<string, unknown> }>({
    mutationFn: ({ event, data }) => measure(event, data),
  });

  return useCallback(
    (event: TelemetryEvent, data?: Record<string, unknown>) => {
      if (IS_SELF_HOSTED) return;

      const mixpanelEnabled = !!MIXPANEL_KEY;

      if (mixpanelEnabled) {
        // @ts-expect-error missing from types
        const sessionReplayProperties = mixpanel.get_session_recording_properties();

        data = {
          ...(data || {}),
          ...sessionReplayProperties,
        };
      }

      mutate({ event: `${event} - [DASHBOARD]`, data });
    },
    [mutate]
  );
};
