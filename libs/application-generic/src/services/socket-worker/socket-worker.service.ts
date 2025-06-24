import { Injectable, Logger } from '@nestjs/common';

const LOG_CONTEXT = 'SocketWorkerService';

@Injectable()
export class SocketWorkerService {
  private readonly socketWorkerUrl: string | undefined;
  private readonly socketWorkerApiKey: string | undefined;

  constructor() {
    this.socketWorkerUrl = process.env.SOCKET_WORKER_URL;
    this.socketWorkerApiKey = process.env.SOCKET_WORKER_API_KEY;
  }

  async sendMessage(
    userId: string,
    event: string,
    data: any,
    organizationId?: string,
    environmentId?: string,
    subscriberId?: string
  ): Promise<void> {
    if (!this.socketWorkerUrl) {
      Logger.debug('Socket worker URL not configured, skipping dispatch', LOG_CONTEXT);

      return;
    }

    if (!this.socketWorkerApiKey) {
      Logger.error('Socket worker API key not configured, cannot dispatch', LOG_CONTEXT);

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

      Logger.log(`Dispatching event ${event} to socket worker for user ${userId}`, LOG_CONTEXT);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (global as any).fetch(`${this.socketWorkerUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.socketWorkerApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          Logger.error(
            `Unauthorized request to socket worker - check API key configuration: ${errorText}`,
            LOG_CONTEXT
          );
        } else {
          Logger.error(`Failed to dispatch to socket worker: ${response.status} - ${errorText}`, LOG_CONTEXT);
        }
      } else {
        Logger.debug(`Successfully dispatched event ${event} to socket worker for user ${userId}`, LOG_CONTEXT);
      }
    } catch (error) {
      Logger.error(
        `Error dispatching to socket worker: ${error instanceof Error ? error.message : String(error)}`,
        LOG_CONTEXT
      );
    }
  }

  isEnabled(): boolean {
    return !!this.socketWorkerUrl && !!this.socketWorkerApiKey;
  }
}
