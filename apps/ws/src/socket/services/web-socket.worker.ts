const nr = require('newrelic');
import { Injectable, Logger } from '@nestjs/common';

import {
  BullMqService,
  getWebSocketWorkerOptions,
  WebSocketsWorkerService,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';

import { ExternalServicesRoute, ExternalServicesRouteCommand } from '../usecases/external-services-route';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';

const LOG_CONTEXT = 'WebSocketWorker';

@Injectable()
export class WebSocketWorker extends WebSocketsWorkerService {
  constructor(
    private externalServicesRoute: ExternalServicesRoute,
    private workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerProcessor() {
    return async (job) => {
      return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        Logger.log(`Job ${job.id} / ${job.data.event} is being processed WebSocketWorker`, LOG_CONTEXT);

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.WS_SOCKET_QUEUE,
          'WS Service',
          function () {
            const transaction = nr.getTransaction();

            _this.externalServicesRoute
              .execute(
                ExternalServicesRouteCommand.create({
                  userId: job.data.userId,
                  event: job.data.event,
                  payload: job.data.payload,
                  _environmentId: job.data._environmentId,
                })
              )
              .then(resolve)
              .catch((error) => {
                Logger.error(
                  error,
                  'Unexpected exception occurred while handling external services route ',
                  LOG_CONTEXT
                );

                reject(error);
              })
              .finally(() => {
                transaction.end();
              });
          }
        );
      });
    };
  }

  private getWorkerOpts(): WorkerOptions {
    return getWebSocketWorkerOptions();
  }
}
