import { post } from './api.client';

export const sendTelemetry = async (event: string, data?: Record<string, unknown>): Promise<void> => {
  await post('/telemetry/measure', {
    event,
    data,
  });
};
