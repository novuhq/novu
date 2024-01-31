import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import {
  JobEntity,
  JobRepository,
  MessageRepository,
  MessageEntity,
  NotificationEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import axios from 'axios';
import { CompileTemplate, CompileTemplateCommand, createHash } from '@novu/application-generic';

const LOG_CONTEXT = 'InboundEmailParse';

@Injectable()
export class InboundEmailParse {
  constructor(
    private jobRepository: JobRepository,
    private messageRepository: MessageRepository,
    private compileTemplate: CompileTemplate
  ) {}

  async execute(command: InboundEmailParseCommand) {
    const { domain, transactionId, environmentId } = this.splitTo(command.to[0].address);

    Logger.debug({ domain, transactionId, environmentId }, `Received new email to parse`, LOG_CONTEXT);

    const { template, notification, subscriber, environment, job, message } = await this.getEntities(
      transactionId,
      environmentId
    );

    if (domain !== environment?.dns?.inboundParseDomain) {
      this.throwMiddleware('Domain is not in environment white list');
    }

    const currentParseWebhook = template.steps.find((step) => step?._id?.toString() === job?.step?._id)?.replyCallback
      ?.url;

    if (!currentParseWebhook) {
      this.throwMiddleware(
        `Missing parse webhook on template ${template._id} job ${job._id} transactionId ${transactionId}.`
      );
    }

    const compiledDomain = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        template: currentParseWebhook as string,
        data: job.payload,
      })
    );

    const userPayload: IUserWebhookPayload = {
      hmac: createHash(environment?.apiKeys[0]?.key, subscriber.subscriberId),
      transactionId: transactionId,
      payload: job.payload,
      templateIdentifier: job.identifier,
      template,
      notification,
      message,
      mail: command,
    };

    await axios.post(compiledDomain, userPayload);
  }

  private splitTo(address: string) {
    const userNameDelimiter = '-nv-e=';

    const [user, domain] = address.split('@');
    const toMetaIds = user.split('+')[1];
    const [transactionId, environmentId] = toMetaIds.split(userNameDelimiter);

    if (!transactionId) {
      this.throwMiddleware(`Missing transactionId on address ${address}`);
    }

    if (!domain) {
      this.throwMiddleware(`Missing domain  on address ${address}`);
    }

    if (!environmentId) {
      this.throwMiddleware(`Missing environmentId on address ${address}`);
    }

    return { domain, transactionId, environmentId };
  }

  private throwMiddleware(error: string) {
    Logger.error(error, LOG_CONTEXT);

    throw new BadRequestException(error);
  }

  private async getEntities(transactionId: string, environmentId: string) {
    const partial: Partial<JobEntity> = { transactionId, _environmentId: environmentId };

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

class MailMetadata extends InboundEmailParseCommand {}

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
