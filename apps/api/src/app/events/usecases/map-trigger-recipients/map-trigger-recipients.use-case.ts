import { Injectable } from '@nestjs/common';
import {
  EnvironmentId,
  ISubscribersDefine,
  ITopic,
  OrganizationId,
  TopicKey,
  TopicSubscribersDto,
  TriggerRecipients,
  TriggerRecipientSubscriber,
  TriggerRecipientTopics,
  TriggerRecipientsTypeEnum,
  UserId,
  TriggerRecipient,
} from '@novu/shared';
import { InstrumentUsecase, FeatureFlagCommand, GetIsTopicNotificationEnabled } from '@novu/application-generic';

import { MapTriggerRecipientsCommand } from './map-trigger-recipients.command';
import { CreateLog } from '../../../logs/usecases/create-log';
import { GetTopicSubscribersCommand, GetTopicSubscribersUseCase } from '../../../topics/use-cases';

interface ILogTopicSubscribersPayload {
  environmentId: EnvironmentId;
  organizationId: OrganizationId;
  topicKey: TopicKey;
  transactionId: string;
  userId: UserId;
}

const isNotTopic = (recipient: TriggerRecipient) => !isTopic(recipient);

const isTopic = (recipient: TriggerRecipient): recipient is ITopic =>
  (recipient as ITopic).type && (recipient as ITopic).type === TriggerRecipientsTypeEnum.TOPIC;

@Injectable()
export class MapTriggerRecipients {
  constructor(
    private createLog: CreateLog,
    private getTopicSubscribers: GetTopicSubscribersUseCase,
    private getIsTopicNotificationEnabled: GetIsTopicNotificationEnabled
  ) {}

  @InstrumentUsecase()
  async execute(command: MapTriggerRecipientsCommand): Promise<ISubscribersDefine[]> {
    const { environmentId, organizationId, recipients, transactionId, userId, actor } = command;
    const mappedRecipients = Array.isArray(recipients) ? recipients : [recipients];

    const simpleSubscribers: ISubscribersDefine[] = this.findSubscribers(mappedRecipients);

    let topicSubscribers: ISubscribersDefine[] = await this.getSubscribersFromAllTopics(
      transactionId,
      environmentId,
      organizationId,
      userId,
      mappedRecipients
    );

    if (actor) {
      topicSubscribers = this.excludeActorFromTopicSubscribers(topicSubscribers, actor);
    }

    return this.deduplicateSubscribers([...simpleSubscribers, ...topicSubscribers]);
  }

  /**
   * Time complexity: O(n)
   */
  private deduplicateSubscribers(subscribers: ISubscribersDefine[]): ISubscribersDefine[] {
    const uniqueSubscribers = new Set();

    return subscribers.filter((el) => {
      const isDuplicate = uniqueSubscribers.has(el.subscriberId);
      uniqueSubscribers.add(el.subscriberId);

      return !isDuplicate;
    });
  }

  private excludeActorFromTopicSubscribers(
    subscribers: ISubscribersDefine[],
    actor: ISubscribersDefine
  ): ISubscribersDefine[] {
    return subscribers.filter((subscriber) => subscriber.subscriberId !== actor?.subscriberId);
  }

  private async getSubscribersFromAllTopics(
    transactionId: string,
    environmentId: EnvironmentId,
    organizationId: OrganizationId,
    userId: UserId,
    recipients: TriggerRecipients
  ): Promise<ISubscribersDefine[]> {
    const featureFlagCommand = FeatureFlagCommand.create({
      environmentId,
      organizationId,
      userId,
    });
    const isEnabled = await this.getIsTopicNotificationEnabled.execute(featureFlagCommand);

    if (isEnabled) {
      const topics = this.findTopics(recipients);

      const subscribers: ISubscribersDefine[] = [];

      for (const topic of topics) {
        const getTopicSubscribersCommand = GetTopicSubscribersCommand.create({
          environmentId,
          topicKey: topic.topicKey,
          organizationId,
        });
        const topicSubscribers = await this.getTopicSubscribers.execute(getTopicSubscribersCommand);

        topicSubscribers.forEach((subscriber: TopicSubscribersDto) =>
          subscribers.push({ subscriberId: subscriber.externalSubscriberId })
        );
      }

      return subscribers;
    }

    return [];
  }

  public mapSubscriber(subscriber: TriggerRecipientSubscriber): ISubscribersDefine {
    if (typeof subscriber === 'string') {
      return { subscriberId: subscriber };
    }

    return subscriber;
  }

  private findSubscribers(recipients: TriggerRecipients): ISubscribersDefine[] {
    return recipients.filter(isNotTopic).map(this.mapSubscriber);
  }

  private findTopics(recipients: TriggerRecipients): TriggerRecipientTopics {
    return recipients.filter(isTopic);
  }
}
