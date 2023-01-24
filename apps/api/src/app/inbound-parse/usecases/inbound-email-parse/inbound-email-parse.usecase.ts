import { Injectable, Logger } from '@nestjs/common';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import { JobEntity, JobRepository, MessageRepository } from '@novu/dal';
import axios from 'axios';
import { createHmac } from 'crypto';

@Injectable()
export class InboundEmailParse {
  axiosInstance = axios.create();
  constructor(private jobRepository: JobRepository, private messageRepository: MessageRepository) {}

  async execute(command: InboundEmailParseCommand) {
    const { toDomain, toTransactionId, toEnvironmentId } = this.splitTo(command.to[0].address);

    if (!toTransactionId) {
      Logger.warn(`missing transactionId on address ${command.to[0].address}`);

      return;
    }

    if (!toEnvironmentId) {
      Logger.warn(`missing environmentId on address ${command.to[0].address}`);

      return;
    }

    const { template, notification, subscriber, environment, job, message } = await this.getEntities(
      toTransactionId,
      toEnvironmentId
    );

    if (toDomain !== environment?.dns?.inboundParseDomain) {
      Logger.warn('to domain is not in environment white list');

      return;
    }

    const currentParseWebhook = template.steps.find((step) => step?._id?.toString() === job?.step?._id)?.replyCallback
      ?.url;

    if (!currentParseWebhook) {
      Logger.warn(`missing parse webhook on template ${template._id} job ${job._id} transactionId ${toTransactionId}.`);

      return;
    }

    const userPayload = {
      hmac: this.createHmac(environment.apiKeys, subscriber.subscriberId),
      transactionId: toTransactionId,
      payload: job.payload,
      templateIdentifier: job.identifier,
      template,
      notification,
      message,
      mail: command,
    };

    await this.axiosInstance.post(`${currentParseWebhook}`, userPayload);
  }

  private splitTo(address: string) {
    const userNameDelimiter = ':nv-e=';

    const [toUser, toDomain] = address.split('@');
    const toMetaIds = toUser.split('+')[1];
    const [toTransactionId, toEnvironmentId] = toMetaIds.split(userNameDelimiter);

    return { toDomain, toTransactionId, toEnvironmentId };
  }

  private async getEntities(transactionId: string, environmentId: string) {
    const partial: Partial<JobEntity> = { transactionId, _environmentId: environmentId };

    const { template, notification, subscriber, environment, ...job } = await this.jobRepository.findOnePopulate({
      query: partial as JobEntity,
      selectTemplate: 'steps',
      selectSubscriber: 'subscriberId',
      selectEnvironment: 'apiKeys dns',
    });

    const message = await this.messageRepository.findOne({ transactionId, _environmentId: environment._id });

    return { transactionId, template, notification, subscriber, environment, job, message };
  }

  createHmac(apiKeys, subscriberId: string) {
    return createHmac('sha256', apiKeys[0].key).update(subscriberId).digest('hex');
  }
}
