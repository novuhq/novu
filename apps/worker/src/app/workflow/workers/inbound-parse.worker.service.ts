import { Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  getInboundParseMailWorkerOptions,
  IInboundParseDataDto,
  IInboundParseJobDto,
  WorkerBaseService,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';
import { InboundEmailParseCommand } from '../usecases/inbound-email-parse/inbound-email-parse.command';
import { InboundEmailParse } from '../usecases/inbound-email-parse/inbound-email-parse.usecase';

const LOG_CONTEXT = 'InboundParseQueueService';

@Injectable()
export class InboundParseWorker extends WorkerBaseService {
  constructor(
    private inboundEmailParseUsecase: InboundEmailParse,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL, new BullMqService(workflowInMemoryProviderService));

    this.createWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return getInboundParseMailWorkerOptions();
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: IInboundParseDataDto }) => {
      Logger.verbose({ data }, 'Processing the inbound parsed email', LOG_CONTEXT);
      await this.inboundEmailParseUsecase.execute(InboundEmailParseCommand.create({ ...data }));
    };
  }
}
