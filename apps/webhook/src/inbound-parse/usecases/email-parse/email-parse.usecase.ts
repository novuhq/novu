import { Injectable } from '@nestjs/common';
import { EmailParseCommand } from './email-parse.command';
import { JobEntity, JobRepository, MessageRepository } from '@novu/dal';
import axios from 'axios';
import { createHmac } from 'crypto';

@Injectable()
export class EmailParse {
  axiosInstance = axios.create();
  constructor(private jobRepository: JobRepository, private messageRepository: MessageRepository) {}

  async execute(command: EmailParseCommand) {
    const { toDomain, toTransactionId } = this.splitTo(command);

    if (!toTransactionId) {
      // eslint-disable-next-line no-console
      console.error('missing transactionId');

      return;
    }

    const { template, notification, subscriber, environment, job, message } = await this.getEntities(toTransactionId);

    if (toDomain !== environment?.dns?.domain) {
      // eslint-disable-next-line no-console
      console.error('to domain is not in environment white list');

      return;
    }

    const currentParseWebhook = template.steps.find((step) => step._id.toString() === job.step.id)?.replyCallback.url;

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

  private splitTo(command: EmailParseCommand) {
    const [toUser, toDomain] = command.to.split('@');
    const toTransactionId = toUser.split('+')[1];

    return { toDomain, toTransactionId };
  }

  private async getEntities(transactionId: string) {
    const partial: Partial<JobEntity> = { transactionId };

    const { template, notification, subscriber, environment, ...job } = await this.jobRepository.findOnePopulate({
      query: partial as unknown as JobEntity,
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
