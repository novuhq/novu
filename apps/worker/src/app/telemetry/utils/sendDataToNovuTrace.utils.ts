import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { env } from '../../../config/env';

export async function sendDataToNovuTrace(
  httpService: HttpService,
  event: string,
  properties: Record<string, unknown>
) {
  try {
    const dataToSend = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    };

    const res = await firstValueFrom(httpService.post(env.OS_TELEMETRY_URL as string, dataToSend));
  } catch (error) {
    Logger.error(`Error sending '${event}' event to Novu Trace:`, error);
  }
}
