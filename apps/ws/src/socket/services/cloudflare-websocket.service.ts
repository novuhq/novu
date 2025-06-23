import { Injectable, Logger } from '@nestjs/common';
import { ValidatedEnv } from '../../config';

const LOG_CONTEXT = 'CloudflareWebSocketService';

@Injectable()
export class CloudflareWebSocketService {
  private readonly cloudflareWorkerUrl: string | undefined;

  constructor() {
    this.cloudflareWorkerUrl = (process.env as ValidatedEnv).CLOUDFLARE_WORKER_URL;
  }

  async sendMessage(
    userId: string,
    event: string,
    data: any,
    organizationId?: string,
    environmentId?: string,
    subscriberId?: string
  ): Promise<void> {
    if (!this.cloudflareWorkerUrl) {
      Logger.debug('Cloudflare worker URL not configured, skipping dispatch', LOG_CONTEXT);

      return;
    }

    try {
      const payload = {
        userId,
        event,
        data,
        organizationId,
        environmentId,
        subscriberId,
      };

      Logger.log(`Dispatching event ${event} to Cloudflare worker for user ${userId}`, LOG_CONTEXT);

      const response = await fetch(`${this.cloudflareWorkerUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error(`Failed to dispatch to Cloudflare worker: ${response.status} - ${errorText}`, LOG_CONTEXT);
      } else {
        Logger.debug(`Successfully dispatched event ${event} to Cloudflare worker for user ${userId}`, LOG_CONTEXT);
      }
    } catch (error) {
      Logger.error(`Error dispatching to Cloudflare worker: ${error.message}`, LOG_CONTEXT);
    }
  }

  isEnabled(): boolean {
    return !!this.cloudflareWorkerUrl;
  }
}
