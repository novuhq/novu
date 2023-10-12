const nr = require('newrelic');
import { Injectable, Logger } from '@nestjs/common';

import { INovuWorker, WebSocketsWorkerService } from '@novu/application-generic';

import { ExternalServicesRoute, ExternalServicesRouteCommand } from '../usecases/external-services-route';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';

const LOG_CONTEXT = 'WebSocketWorker';

@Injectable()
export class WebSocketWorker extends WebSocketsWorkerService implements INovuWorker {
  constructor(private externalServicesRoute: ExternalServicesRoute) {
    super();

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerProcessor() {
    return async (job) => {
      return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        Logger.verbose(
          `Job ${job.id} / ${job.data.event} is being processed in the MemoryDB instance WebSocketWorker`,
          LOG_CONTEXT
        );

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
                  'Unexpected exception occurred while handling external services route ',
                  error,
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

  private getWorkerOpts() {
    return {
      lockDuration: 90000,
      concurrency: 200,
    };
  }
}
