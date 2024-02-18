import { Injectable } from '@nestjs/common';
import {
  EnvironmentId,
  FeatureFlagsKeysEnum,
  ISubscribersDefine,
  ISubscribersSource,
  ITopic,
  OrganizationId,
  SubscriberSourceEnum,
  TopicSubscribersDto,
  TriggerRecipient,
  TriggerRecipients,
  TriggerRecipientsTypeEnum,
  TriggerRecipientSubscriber,
  TriggerRecipientTopics,
  UserId,
} from '@novu/shared';

import { MapTriggerRecipientsCommand } from './map-trigger-recipients.command';
import {
  GetTopicSubscribersCommand,
  GetTopicSubscribersUseCase,
} from '../get-topic-subscribers';
import { GetFeatureFlag, GetFeatureFlagCommand } from '../get-feature-flag';
import { InstrumentUsecase } from '../../instrumentation';

const isNotTopic = (
  recipient: TriggerRecipient
): recipient is TriggerRecipientSubscriber => !isTopic(recipient);

const isTopic = (recipient: TriggerRecipient): recipient is ITopic =>
  (recipient as ITopic).type &&
  (recipient as ITopic).type === TriggerRecipientsTypeEnum.TOPIC;

@Injectable()
export class MapTriggerRecipients {
  constructor(
    private getTopicSubscribers: GetTopicSubscribersUseCase,
    private getFeatureFlag: GetFeatureFlag
  ) {}

  @InstrumentUsecase()
  async execute(
    command: MapTriggerRecipientsCommand
  ): Promise<ISubscribersSource[]> {
    const {
      environmentId,
      organizationId,
      recipients,
      transactionId,
      userId,
      actor,
    } = command;

    const mappedRecipients = Array.isArray(recipients)
      ? recipients
      : [recipients];

    const simpleSubscribers: ISubscribersSource[] = this.findSubscribers(
      mappedRecipients,
      SubscriberSourceEnum.SINGLE
    );

    let topicSubscribers: ISubscribersSource[] =
      await this.getSubscribersFromAllTopics(
        environmentId,
        organizationId,
        userId,
        mappedRecipients
      );

    if (actor) {
      topicSubscribers = this.excludeActorFromTopicSubscribers(
        topicSubscribers,
        actor
      );
    }

    return this.deduplicateSubscribers([
      ...simpleSubscribers,
      ...topicSubscribers,
    ]);
  }

  /**
   * Time complexity: O(n)
   */
  private deduplicateSubscribers(
    subscribers: ISubscribersSource[]
  ): ISubscribersSource[] {
    const uniqueSubscribers = new Set();

    return subscribers.filter((el) => {
      const isDuplicate = uniqueSubscribers.has(el.subscriberId);
      uniqueSubscribers.add(el.subscriberId);

      return !isDuplicate;
    });
  }

  private excludeActorFromTopicSubscribers(
    subscribers: ISubscribersSource[],
    actor: ISubscribersDefine
  ): ISubscribersSource[] {
    return subscribers.filter(
      (subscriber) => subscriber.subscriberId !== actor?.subscriberId
    );
  }

  private async getSubscribersFromAllTopics(
    environmentId: EnvironmentId,
    organizationId: OrganizationId,
    userId: UserId,
    recipients: TriggerRecipients
  ): Promise<ISubscribersSource[]> {
    const featureFlagCommand = GetFeatureFlagCommand.create({
      environmentId,
      organizationId,
      userId,
      key: FeatureFlagsKeysEnum.IS_TOPIC_NOTIFICATION_ENABLED,
    });
    const isEnabled = await this.getFeatureFlag.execute(featureFlagCommand);

    if (isEnabled) {
      const topics = this.findTopics(recipients);

      const subscribers: ISubscribersSource[] = [];

      for (const topic of topics) {
        const getTopicSubscribersCommand = GetTopicSubscribersCommand.create({
          environmentId,
          topicKey: topic.topicKey,
          organizationId,
        });
        const topicSubscribers = await this.getTopicSubscribers.execute(
          getTopicSubscribersCommand
        );

        topicSubscribers.forEach((subscriber: TopicSubscribersDto) =>
          subscribers.push({
            subscriberId: subscriber.externalSubscriberId,
            _subscriberSource: SubscriberSourceEnum.TOPIC,
          })
        );
      }

      return subscribers;
    }

    return [];
  }

  public mapActor(
    subscriber: TriggerRecipientSubscriber
  ): ISubscribersDefine | null {
    if (!subscriber) return null;

    if (typeof subscriber === 'string') {
      return { subscriberId: subscriber };
    }

    return subscriber;
  }

  public mapSubscriber(
    subscriber: TriggerRecipientSubscriber,
    source: SubscriberSourceEnum
  ): ISubscribersSource | null {
    if (!subscriber) return null;

    let mappedSubscriber: Partial<ISubscribersSource>;

    if (typeof subscriber === 'string') {
      mappedSubscriber = { subscriberId: subscriber };
    } else {
      mappedSubscriber = subscriber;
    }

    return {
      ...mappedSubscriber,
      _subscriberSource: source,
    } as ISubscribersSource;
  }

  private findSubscribers(
    recipients: TriggerRecipients,
    source: SubscriberSourceEnum
  ): ISubscribersSource[] {
    return recipients
      .filter(isNotTopic)
      .map((subscriber) => this.mapSubscriber(subscriber, source));
  }

  private findTopics(recipients: TriggerRecipients): TriggerRecipientTopics {
    return recipients.filter(isTopic);
  }
}
