import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { env } from '@novu/application-generic';
import { firstValueFrom } from 'rxjs';

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
