import { JobTopicNameEnum } from '@novu/shared';
import { BullMqService } from '../bull-mq';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'TranslationWorkerService';

/**
 * TranslationWorkerService
 *
 * Base service class for the translation worker that processes
 * asynchronous translation jobs from the translation queue.
 *
 * This service extends WorkerBaseService and is configured to use
 * the TRANSLATION queue topic.
 *
 * Usage:
 * The actual worker implementation in apps/worker will extend this
 * service and implement the job processing logic.
 */
export class TranslationWorkerService extends WorkerBaseService {
  constructor(public bullMqService: BullMqService) {
    super(JobTopicNameEnum.TRANSLATION, bullMqService);
  }
}
