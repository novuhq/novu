import { Injectable, Logger } from '@nestjs/common';

import {
  BullMqService,
  getWebSocketWorkerOptions,
  IWebSocketDataDto,
  Job,
  PinoLogger,
  SqsService,
  WebSocketsWorkerService,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';

import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import { ExternalServicesRoute, ExternalServicesRouteCommand } from '../usecases/external-services-route';

const nr = require('newrelic');

const LOG_CONTEXT = 'WebSocketWorker';

@Injectable()
export class WebSocketWorker extends WebSocketsWorkerService {
  constructor(
    private externalServicesRoute: ExternalServicesRoute,
    private workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    sqsService: SqsService,
    logger: PinoLogger
  ) {
    super(new BullMqService(workflowInMemoryProviderService), sqsService, logger);

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOpts(), true);

    /*
     * Match BullMQ semantics on the SQS path: WS jobs are enqueued with
     * `attempts: 1` + `removeOnFail: true`, so a failure on BullMQ is logged
     * once and the job is dropped from Redis with no retry. WS payloads are
     * point-in-time UI hints (unseen-count changes, in-app updates) - replaying
     * them 90s+ later is harmful (target socket may be gone, a fresher emit or
     * client poll has already healed the UI). Acking the SQS message on any
     * failure prevents poison-message accumulation in the WS DLQ.
     */
    this.setSqsFailedHandler(async (job: Job<IWebSocketDataDto, void, string>, error: Error): Promise<boolean> => {
      Logger.warn(
        {
          jobId: job.id,
          event: job.data?.event,
          error: error instanceof Error ? error.message : String(error),
        },
        'WS emit failed, dropping (real-time event, no replay)',
        LOG_CONTEXT
      );

      return false;
    });

    this.startSqsConsumer();
  }

  private getWorkerProcessor() {
    return async (job) => {
      return new Promise<void>((resolve, reject) => {
        const _this = this;

        const { data: jobData } = job;

        // Skip processing if marked (for shadow/live modes)
        if (jobData.skipProcessing) {
          Logger.log(`Skipping job ${job.id} - skipProcessing flag is set`, LOG_CONTEXT);
          resolve();
          return;
        }

        Logger.log(`Job ${job.id} / ${jobData.event} is being processed WebSocketWorker`, LOG_CONTEXT);

        nr.startBackgroundTransaction(ObservabilityBackgroundTransactionEnum.WS_SOCKET_QUEUE, 'WS Service', () => {
          const transaction = nr.getTransaction();
          const data: IWebSocketDataDto = jobData;

          _this.externalServicesRoute
            .execute(
              ExternalServicesRouteCommand.create({
                userId: data.userId,
                event: data.event,
                payload: data.payload,
                _environmentId: data._environmentId,
                contextKeys: data.contextKeys ?? [],
              })
            )
            .then(() => resolve())
            .catch((error) => {
              Logger.error(error, 'Unexpected exception occurred while handling external services route ', LOG_CONTEXT);

              reject(error);
            })
            .finally(() => {
              transaction.end();
            });
        });
      });
    };
  }

  private getWorkerOpts(): WorkerOptions {
    return getWebSocketWorkerOptions();
  }
}
