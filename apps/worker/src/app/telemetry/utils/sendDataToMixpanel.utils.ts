import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

export async function sendDataToMixpanel(httpService: HttpService, event: string, properties: any) {
  try {
    Logger.debug(`Sending '${event}' event to Mixpanel`);
    const dataToSend = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    };

    const res = await firstValueFrom(httpService.post(process.env.OS_TELEMETRY_URL as string, dataToSend));
    Logger.debug(`Response from Mixpanel: ${JSON.stringify(res.data)}`);
    Logger.debug(`'${event}' event sent to Mixpanel successfully.`);
  } catch (error) {
    Logger.error(`Error sending '${event}' event to Mixpanel:`, error);
  }
}
