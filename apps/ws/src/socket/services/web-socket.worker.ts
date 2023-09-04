import { Injectable, Logger } from '@nestjs/common';

import { INovuWorker, WebSocketsWorkerService } from '@novu/application-generic';

import { ExternalServicesRoute, ExternalServicesRouteCommand } from '../usecases/external-services-route';

const LOG_CONTEXT = 'WebSocketWorker';

@Injectable()
export class WebSocketWorker extends WebSocketsWorkerService implements INovuWorker {
  constructor(private externalServicesRoute: ExternalServicesRoute) {
    super();

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerProcessor() {
    return async (job) => {
      try {
        await this.externalServicesRoute.execute(
          ExternalServicesRouteCommand.create({
            userId: job.data.userId,
            event: job.data.event,
            payload: job.data.payload,
            _environmentId: job.data._environmentId,
          })
        );
      } catch (e) {
        Logger.error('Unexpected exception occurred while handling external services route ', e, LOG_CONTEXT);

        throw e;
      }
    };
  }

  private getWorkerOpts() {
    return {
      lockDuration: 90000,
      concurrency: 5,
    };
  }
}
