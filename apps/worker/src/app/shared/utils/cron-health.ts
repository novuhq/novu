import { Logger } from '@nestjs/common';

const url = process.env.CRON_CHECKIN_URL
  ? process.env.CRON_CHECKIN_URL
  : 'https://uptime.betterstack.com/api/v1/heartbeat/';
const LOG_CONTEXT = 'cronHealth';
export async function checkinForCronJob(cronId?: string) {
  if (process.env.NOVU_MANAGED_SERVICE && process.env.NODE_ENV === 'production' && cronId && url) {
    Logger.verbose(`Calling health endpoint for ${cronId}`);
    await fetch(url + cronId)
      .then((response) => Logger.debug(`Response from better Uptime: ${response.status}`))
      .catch((error) => Logger.error('Failed calling better Uptime', error, LOG_CONTEXT));
  }
}
