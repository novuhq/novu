import { Injectable, Logger } from '@nestjs/common';

import {
  BullMqService,
  getWebSocketWorkerOptions,
  IWebSocketDataDto,
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

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOpts());
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
