import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AttachmentRehydrator,
  assertSafeOutboundUrl,
  CompileTemplate,
  createHash,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
  safeOutboundJsonRequest,
} from '@novu/application-generic';
import {
  JobEntity,
  JobRepository,
  MessageEntity,
  MessageRepository,
  NotificationEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import { InboundEmailAttachment, StepTypeEnum } from '@novu/shared';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';
import {
  InboundParseOutcome,
  InboundParseProcessingError,
  toCustomerDeliveryFailureMessage,
} from '../inbound-parse-outcome';

const LOG_CONTEXT = 'ReplyToStrategy';

type ResolvedReplyToContext = {
  organizationId: string;
  environmentId: string;
  transactionId: string;
};

@Injectable()
export class ReplyToStrategy {
  constructor(
    private jobRepository: JobRepository,
    private messageRepository: MessageRepository,
    private compileTemplate: CompileTemplate,
    private attachmentRehydrator: AttachmentRehydrator
  ) {}

  async execute(command: InboundEmailParseCommand): Promise<InboundParseOutcome> {
    const { domain, transactionId, environmentId } = this.splitTo(command.to[0].address);

    Logger.log({ domain, transactionId, environmentId }, 'Processing reply-to email', LOG_CONTEXT);

    const { template, notification, subscriber, environment, job, message } = await this.getEntities(
      transactionId,
      environmentId
    );

    // Tenant context is fully resolved here; failures from this point on carry it
    // so the centralized emit point can still write a request log row.
    const resolved: ResolvedReplyToContext = {
      organizationId: job._organizationId,
      environmentId,
      transactionId,
    };

    if (domain !== environment?.dns?.inboundParseDomain) {
      this.fail(resolved, 422, 'Domain is not in environment white list');
    }

    const currentParseWebhook = template?.steps?.find((step) => step?._id?.toString() === job?.step?._id)?.replyCallback
      ?.url;

    if (!currentParseWebhook) {
      this.fail(
        resolved,
        422,
        `Missing parse webhook on template ${template._id} job ${job._id} transactionId ${transactionId}.`
      );
    }

    const compiledDomain = await this.compileTemplate.execute({
      template: currentParseWebhook as string,
      data: job.payload,
    });

    const requestUrl = normalizeOutboundHttpUrl(compiledDomain);

    if (!requestUrl) {
      this.fail(resolved, 422, 'Reply callback URL blocked (SSRF): Invalid URL format.');
    }

    try {
      assertSafeOutboundUrl(requestUrl);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        this.fail(resolved, 422, `Reply callback URL blocked (SSRF): ${err.message}`);
      }
      throw err;
    }

    // HMAC is built only after the URL passes the synchronous policy check.
    // safeOutboundJsonRequest below performs the connect-time DNS guard and
    // re-runs the policy on every redirect target.
    const rehydratedAttachments: InboundEmailAttachment[] = await this.attachmentRehydrator.rehydrate(
      command.attachments
    );
    const userPayload: IUserWebhookPayload = {
      hmac: createHash(environment?.apiKeys[0]?.key, subscriber.subscriberId) || '',
      transactionId,
      payload: job.payload,
      templateIdentifier: job.identifier,
      template,
      notification,
      message,
      mail: { ...command, attachments: rehydratedAttachments },
    };

    try {
      await safeOutboundJsonRequest({ url: requestUrl, method: 'POST', body: userPayload });
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        this.fail(resolved, 422, `Reply callback URL blocked (SSRF): ${err.message}`);
      }
      this.fail(
        resolved,
        502,
        `Reply callback delivery failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }

    return { ...resolved, strategy: 'reply-to', status: 200 };
  }

  private fail(resolved: ResolvedReplyToContext, status: number, message: string): never {
    Logger.error(message, LOG_CONTEXT);
    const customerMessage = toCustomerDeliveryFailureMessage(status, message);
    throw new InboundParseProcessingError(message, {
      ...resolved,
      strategy: 'reply-to',
      status,
      message: customerMessage,
    });
  }

  private splitTo(address: string) {
    const userNameDelimiter = '-nv-e=';

    const [user, domain] = address.split('@');
    const toMetaIds = user.split('+')[1];

    if (!toMetaIds) {
      this.throwError(`Missing metadata segment in address ${address}`);
    }

    const [transactionId, environmentId] = (toMetaIds as string).split(userNameDelimiter);

    if (!transactionId) {
      this.throwError(`Missing transactionId on address ${address}`);
    }

    if (!domain) {
      this.throwError(`Missing domain on address ${address}`);
    }

    if (!environmentId) {
      this.throwError(`Missing environmentId on address ${address}`);
    }

    return { domain, transactionId, environmentId };
  }

  private throwError(error: string): never {
    Logger.error(error, LOG_CONTEXT);
    throw new BadRequestException(error);
  }

  private async getEntities(transactionId: string, environmentId: string) {
    const partial: Partial<JobEntity> = { transactionId, _environmentId: environmentId, type: StepTypeEnum.EMAIL };

    const { template, notification, subscriber, environment, ...job } = await this.jobRepository.findOnePopulate({
      query: partial as JobEntity,
      selectTemplate: 'steps',
      selectSubscriber: 'subscriberId',
      selectEnvironment: 'apiKeys dns',
    });

    const message = await this.messageRepository.findOne({
      transactionId,
      _environmentId: environment._id,
      _subscriberId: subscriber._id,
    });

    return { template, notification, subscriber, environment, job, message };
  }
}

type MailMetadata = Omit<InboundEmailParseCommand, 'attachments'> & {
  attachments?: InboundEmailAttachment[];
};

export interface IUserWebhookPayload {
  transactionId: string;
  templateIdentifier: string;
  payload: Record<string, unknown>;
  template: NotificationTemplateEntity;
  notification: NotificationEntity;
  message: MessageEntity | null;
  mail: MailMetadata;
  hmac: string;
}
