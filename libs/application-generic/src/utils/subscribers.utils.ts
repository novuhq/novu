import { TopicEntity } from '@novu/dal';
import { ISubscribersDefine, SubscriberSourceEnum } from '@novu/shared';
import { IProcessSubscriberBulkJobDto } from '../dtos';
import { BaseTriggerCommand } from '../usecases/trigger-base/trigger-base.usecase';

export function mapSubscribersToJobs(
  subscriberSource: SubscriberSourceEnum,
  subscribers: { subscriberId: string; topics?: Pick<TopicEntity, '_id' | 'key'>[] }[] | ISubscribersDefine[],
  command: BaseTriggerCommand
): IProcessSubscriberBulkJobDto[] {
  return subscribers.map((subscriber) => {
    const job: IProcessSubscriberBulkJobDto = {
      name: command.transactionId + subscriber.subscriberId,
      data: {
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        transactionId: command.transactionId,
        requestId: command.requestId,
        identifier: command.identifier,
        payload: command.payload,
        overrides: command.overrides,
        subscriber,
        topics: subscriber.topics,
        templateId: command.template._id,
        _subscriberSource: subscriberSource,
        requestCategory: command.requestCategory,
        controls: command.controls,
        bridge: {
          url: command.bridgeUrl,
          workflow: command.bridgeWorkflow,
        },
        environmentName: command.environmentName,
      },
      groupId: command.organizationId,
    };

    if (command.actor) {
      job.data.actor = command.actor;
    }
    if (command.tenant) {
      job.data.tenant = command.tenant;
    }

    return job;
  });
}
