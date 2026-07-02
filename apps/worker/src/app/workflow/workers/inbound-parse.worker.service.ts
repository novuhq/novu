import { Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  getInboundParseMailWorkerOptions,
  IInboundParseDataDto,
  InboundMailRequestLogger,
  WorkerBaseService,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';
import { InboundEmailParseCommand } from '../usecases/inbound-email-parse/inbound-email-parse.command';
import { InboundEmailParse } from '../usecases/inbound-email-parse/inbound-email-parse.usecase';
import { InboundParseProcessingError } from '../usecases/inbound-email-parse/inbound-parse-outcome';
import { severityFromInboundStatus } from '../usecases/inbound-email-parse/log-inbound-email-request.usecase';

const LOG_CONTEXT = 'InboundParseQueueService';

@Injectable()
export class InboundParseWorker extends WorkerBaseService {
  /* *
   * BullMQ-only worker - no SQS support.
   * Processes inbound email parsing, not part of the SQS migration.
   */
  constructor(
    private inboundEmailParseUsecase: InboundEmailParse,
    private inboundMailRequestLogger: InboundMailRequestLogger,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL, new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
    this.registerFailedSafetyNet();
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

  /**
   * Safety net: BullMQ's `failed` event fires after every failed attempt. We
   * only emit a terminal `request_failed` trace once BullMQ has exhausted all
   * configured retries — intermediate 5xx retries do not get duplicate traces
   * on the request, only the final outcome does. Handles retriable
   * `InboundParseProcessingError` outcomes and unhandled exceptions that
   * bypass `InboundEmailParse.execute()`'s own catch block.
   */
  private registerFailedSafetyNet(): void {
    const worker = this.bullMqWorker;

    if (!worker) {
      return;
    }

    worker.on('failed', (job, error) => {
      if (!job) {
        return;
      }

      const attemptsMade = job.attemptsMade ?? 0;
      const maxAttempts = job.opts?.attempts ?? 1;

      // Wait until the final attempt before recording the terminal trace, so
      // retries don't generate noise. Non-retriable failures are traced inside
      // `InboundEmailParse`; this handler covers retriable 5xx outcomes and
      // unhandled exceptions after retries exhaust.
      if (attemptsMade < maxAttempts) {
        return;
      }

      const data = job.data as IInboundParseDataDto | undefined;
      if (!data?.requestLogId) {
        return;
      }

      const processingError = error instanceof InboundParseProcessingError ? error : undefined;
      const outcome = processingError?.outcome;
      const message =
        outcome?.message ??
        (error instanceof Error ? error.message : 'Inbound mail processing failed after exhausted retries');

      this.inboundMailRequestLogger
        .logCompleted({
          requestLogId: data.requestLogId,
          organizationId: outcome?.organizationId ?? '',
          environmentId: outcome?.environmentId ?? '',
          transactionId: outcome?.transactionId ?? data.messageId ?? '',
          delivered: false,
          severity: outcome ? severityFromInboundStatus(outcome.status) : 'error',
          message,
        })
        .catch((traceError) => {
          Logger.warn(
            { err: traceError, jobId: job.id, requestLogId: data.requestLogId },
            'Failed to write inbound-email exhausted-retries trace',
            LOG_CONTEXT
          );
        });
    });
  }
}
