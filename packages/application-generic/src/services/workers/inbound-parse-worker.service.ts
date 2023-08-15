import { Inject, Injectable } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService, WorkerOptions, WorkerProcessor } from './index';

@Injectable()
export class InboundParseWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL);
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions): void {
    this.createWorker(processor, options);
  }
}
