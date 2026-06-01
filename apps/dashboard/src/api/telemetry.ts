import { post } from './api.client';

export const measure = async (event: string, data?: Record<string, unknown>): Promise<void> => {
  await post('/telemetry/measure', {
    body: {
      event,
      data,
    },
  });
};

export const identifyTelemetry = async (anonymousId: string): Promise<void> => {
  await post('/telemetry/identify', {
    body: {
      anonymousId,
    },
  });
};
