import { Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  getInboundParseMailWorkerOptions,
  IInboundParseDataDto,
  INBOUND_PARSE_RETRY_POLICY,
  InboundMailRequestLogger,
  ISqsFailureOutcome,
  Job,
  PinoLogger,
  SqsService,
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

/**
 * The SQS queue's own redrive policy decides when a message stops being
 * redelivered, so the worker cannot infer the last attempt - it has to be told
 * the same number the infrastructure was configured with. Defaults to the
 * shared policy, which is what the redrive policy should be set to.
 */
function getMaxReceiveCount(): number {
  const configured = Number(process.env.SQS_INBOUND_PARSE_MAX_RECEIVE_COUNT);

  return Number.isFinite(configured) && configured > 0 ? configured : INBOUND_PARSE_RETRY_POLICY.attempts;
}

@Injectable()
export class InboundParseWorker extends WorkerBaseService {
  constructor(
    private inboundEmailParseUsecase: InboundEmailParse,
    private inboundMailRequestLogger: InboundMailRequestLogger,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    sqsService: SqsService,
    logger: PinoLogger
  ) {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL, new BullMqService(workflowInMemoryProviderService), sqsService, logger);

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
    this.registerFailedSafetyNet();
    this.registerSqsFailedSafetyNet();
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

      this.traceExhaustedRetries(job, error);
    });
  }

  /**
   * The SQS equivalent of the BullMQ `failed` listener above.
   *
   * `receiveCount` is the only attempt counter SQS offers, and the redrive
   * policy - not this code - decides when redelivery stops, so the terminal
   * trace is keyed on reaching the configured ceiling. Until then the message
   * is re-thrown with the same exponential delay the BullMQ queue applies.
   */
  private registerSqsFailedSafetyNet(): void {
    this.setSqsFailedHandler(
      async (job: Job<IInboundParseDataDto, void, string>, error: Error): Promise<ISqsFailureOutcome> => {
        const receiveCount = job.attemptsMade ?? 1;
        const maxReceiveCount = getMaxReceiveCount();

        if (receiveCount >= maxReceiveCount) {
          this.traceExhaustedRetries(job, error);

          /*
           * Acking here would delete the message instead of letting the
           * redrive policy move it to the DLQ, which is where an inbound mail
           * that never parsed needs to end up.
           */
          return { retry: true };
        }

        return { retry: true, retryDelayMs: INBOUND_PARSE_RETRY_POLICY.backoffBaseMs * 2 ** (receiveCount - 1) };
      }
    );
  }

  /**
   * Writes the terminal `request_failed` trace for a job that will not be
   * retried again. Shared by both backends so the request detail view shows
   * the same lifecycle regardless of which one delivered the job.
   */
  private traceExhaustedRetries(job: Job<IInboundParseDataDto, unknown, string>, error: Error): void {
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
  }
}
