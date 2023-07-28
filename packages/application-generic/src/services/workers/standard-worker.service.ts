import { Inject, Injectable } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService, WorkerOptions, WorkerProcessor } from './index';

@Injectable()
export class StandardWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.STANDARD);
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions): void {
    this.createWorker(processor, options);
  }
}
