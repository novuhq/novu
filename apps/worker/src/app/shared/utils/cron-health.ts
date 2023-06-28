import { Logger } from '@nestjs/common';

const url = 'https://uptime.betterstack.com/api/v1/heartbeat/';
const LOG_CONTEXT = 'cronHealth';
export async function checkinForCronJob(cronId?: string) {
  if (process.env.NOVU_MANAGED_SERVICE && process.env.NODE_ENV === 'production' && cronId) {
    Logger.verbose(`Calling health endpoint for ${cronId}`);
    await fetch(url + cronId)
      .then((response) => response.json())
      .catch((error) => Logger.error('Failed calling better Uptime', error, LOG_CONTEXT));
  }
}
