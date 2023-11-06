import { Logger } from '@nestjs/common';

const url = process.env.CRON_CHECKING_URL
  ? process.env.CRON_CHECKING_URL
  : 'https://uptime.betterstack.com/api/v1/heartbeat/';
const LOG_CONTEXT = 'cronHealth';
export async function checkingForCronJob(cronId?: string) {
  if (process.env.NOVU_MANAGED_SERVICE && process.env.NODE_ENV === 'production' && cronId && url) {
    Logger.verbose(`Calling health endpoint for ${cronId}`);

    const response = await fetch(url + cronId);

    if (response.status !== 200) {
      Logger.error(`Failed calling better Uptime: ${response.status}`, LOG_CONTEXT);
    } else {
      Logger.verbose(`Response from better Uptime: ${response.status}`, LOG_CONTEXT);
    }
  }
}
