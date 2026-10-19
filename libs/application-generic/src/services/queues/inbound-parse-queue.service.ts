import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { IInboundParseBulkJobDto, IInboundParseJobDto } from '../../dtos/inbound-parse-job.dto';
import { BullMqService, QueueOptions } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { SqsService } from '../sqs';
import { IBulkJobParams, IJobParams, QueueBaseService } from './queue-base.service';

const LOG_CONTEXT = 'InboundParseQueueService';

/**
 * Retry cadence for inbound mail, shared by both backends.
 *
 * BullMQ takes it declaratively through the queue options below. SQS has no
 * equivalent, so `InboundParseWorker` reproduces the same curve by shortening
 * each message's visibility timeout, and `attempts` is what the queue's
 * redrive policy has to be set to. One definition so the two cannot drift.
 */
export const INBOUND_PARSE_RETRY_POLICY = {
  attempts: 5,
  backoffBaseMs: 4000,
} as const;

@Injectable()
export class InboundParseQueueService extends QueueBaseService {
  constructor(
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    sqsService: SqsService
  ) {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL, new BullMqService(workflowInMemoryProviderService), sqsService);

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue(this.getOverrideOptions());
  }

  /**
   * Inbound mail has no tenant to be fair between - a domain is not an
   * organization, and grouping by one would make SQS process that domain's
   * mail strictly one message at a time. A per-message group keeps delivery
   * fully parallel, which is what this queue wants.
   */
  protected resolveGroupId(job: IJobParams | IBulkJobParams): string {
    const data = job.data as IInboundParseJobDto['data'];

    return data?.messageId || data?.connection?.id || job.name;
  }

  public async add(data: IInboundParseJobDto) {
    return await super.add(data);
  }

  public async addBulk(data: IInboundParseBulkJobDto[]) {
    return await super.addBulk(data);
  }

  private getOverrideOptions(): QueueOptions {
    return {
      defaultJobOptions: {
        attempts: INBOUND_PARSE_RETRY_POLICY.attempts,
        backoff: {
          delay: INBOUND_PARSE_RETRY_POLICY.backoffBaseMs,
          type: 'exponential',
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    };
  }
}
