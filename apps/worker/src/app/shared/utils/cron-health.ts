import { Logger } from '@nestjs/common';

const LOG_CONTEXT = 'cronHealth';
export async function checkingForCronJob(cronId?: string) {
  const CRON_CHECKING_URL = process.env.CRON_CHECKING_URL
    ? process.env.CRON_CHECKING_URL
    : 'https://uptime.betterstack.com/api/v1/heartbeat/';

  if (process.env.NOVU_MANAGED_SERVICE && process.env.NODE_ENV === 'production' && cronId && CRON_CHECKING_URL) {
    Logger.verbose(`Calling health endpoint for ${cronId}`);

    const response = await fetch(CRON_CHECKING_URL + cronId);

    if (response.status !== 200) {
      Logger.error(`Failed calling better Uptime: ${response.status}`, LOG_CONTEXT);
    } else {
      Logger.verbose(`Response from better Uptime: ${response.status}`, LOG_CONTEXT);
    }
  }
}
