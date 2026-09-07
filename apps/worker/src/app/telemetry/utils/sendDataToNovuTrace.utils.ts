import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

export async function sendDataToNovuTrace(httpService: HttpService, event: string, properties: any) {
  try {
    const dataToSend = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    };

    const res = await firstValueFrom(httpService.post(process.env.OS_TELEMETRY_URL as string, dataToSend));
  } catch (error) {
    Logger.error(`Error sending '${event}' event to Novu Trace:`, error);
  }
}
